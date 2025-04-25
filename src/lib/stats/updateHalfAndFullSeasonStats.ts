import { PrismaClient, Prisma } from '@prisma/client';
import { AppConfig } from '@/lib/config';

const prisma = new PrismaClient();

// Helper function to calculate fantasy points based on config
function calculateFantasyPoints(
  stats: {
    wins: number;
    draws: number;
    losses: number;
    heavy_wins: number;
    heavy_losses: number;
    clean_sheet_wins: number;
    clean_sheet_draws: number;
    heavy_clean_sheet_wins: number;
  },
  config: AppConfig
): number {
  // Use defaults from AppConfig if specific keys aren't present (though getAppConfig should provide them)
  const win_points = (config.fantasy_win_points ?? 20) as number;
  const draw_points = (config.fantasy_draw_points ?? 10) as number;
  const loss_points = (config.fantasy_loss_points ?? -10) as number;
  const heavy_win_points = (config.fantasy_heavy_win_points ?? 30) as number;
  const clean_sheet_win_points = (config.fantasy_clean_sheet_win_points ?? 30) as number;
  const heavy_clean_sheet_win_points = (config.fantasy_heavy_clean_sheet_win_points ?? 40) as number;
  const clean_sheet_draw_points = (config.fantasy_clean_sheet_draw_points ?? 20) as number;
  const heavy_loss_points = (config.fantasy_heavy_loss_points ?? -20) as number;

  const regular_wins = stats.wins - stats.heavy_wins - stats.clean_sheet_wins + stats.heavy_clean_sheet_wins;
  const regular_draws = stats.draws - stats.clean_sheet_draws;
  const regular_losses = stats.losses - stats.heavy_losses;

  return (
    regular_wins * win_points +
    stats.heavy_wins * heavy_win_points +
    stats.clean_sheet_wins * clean_sheet_win_points +
    stats.heavy_clean_sheet_wins * heavy_clean_sheet_win_points +
    regular_draws * draw_points +
    stats.clean_sheet_draws * clean_sheet_draw_points +
    regular_losses * loss_points +
    stats.heavy_losses * heavy_loss_points
  );
}

/**
 * Updates the aggregated_half_season_stats and aggregated_season_stats tables
 * based on current match data, replicating the handle_match_update SQL function.
 * 
 * @param tx Optional transaction client
 * @param config Application configuration containing fantasy point values
 */
export async function updateHalfAndFullSeasonStats(
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  config?: AppConfig
): Promise<void> {
  console.log('Starting updateHalfAndFullSeasonStats...');
  const startTime = Date.now();

  // Use provided transaction client or fall back to global prisma client
  const client = tx || prisma;

  // Ensure we have a config object
  if (!config) {
    throw new Error('Config object is required for updateHalfAndFullSeasonStats');
  }

  try {
    // Extract fantasy point values from config with fallbacks (same as SQL function)
    const win_points = config.fantasy_win_points || 20;
    const draw_points = config.fantasy_draw_points || 10;
    const loss_points = config.fantasy_loss_points || -10;
    const heavy_win_points = config.fantasy_heavy_win_points || 30;
    const clean_sheet_win_points = config.fantasy_clean_sheet_win_points || 30;
    const heavy_clean_sheet_win_points = config.fantasy_heavy_clean_sheet_win_points || 40;
    const clean_sheet_draw_points = config.fantasy_clean_sheet_draw_points || 20;
    const heavy_loss_points = config.fantasy_heavy_loss_points || -20;

    // ---------------------------------------------------------------------------------
    // HALF SEASON STATS
    // ---------------------------------------------------------------------------------
    // Determine current half-season date range
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed, SQL expects 1-12

    let half_season_start: Date, half_season_end: Date;

    if (currentMonth <= 6) {
      // First half of year
      half_season_start = new Date(currentYear, 0, 1); // January 1st
      half_season_end = new Date(currentYear, 5, 30); // June 30th
    } else {
      // Second half of year
      half_season_start = new Date(currentYear, 6, 1); // July 1st
      half_season_end = new Date(currentYear, 11, 31); // December 31st
    }

    console.log(`  Calculating half-season stats for period: ${half_season_start.toISOString().slice(0, 10)} to ${half_season_end.toISOString().slice(0, 10)}`);

    // Fetch player match data for current half season
    const halfSeasonMatchData = await client.player_matches.findMany({
      where: {
        matches: {
          match_date: {
            gte: half_season_start,
            lte: half_season_end,
          },
        },
        players: {
          is_ringer: false,
        },
      },
      include: {
        matches: {
          select: { match_date: true },
        },
        players: {
          select: { player_id: true, name: true },
        },
      },
    });

    // Process half-season stats
    const halfSeasonStats = new Map<number, {
      player_id: number;
      games: number;
      wins: number;
      draws: number;
      losses: number;
      goals: number;
      heavy_wins: number;
      heavy_losses: number;
      clean_sheet_wins: number;
      clean_sheet_draws: number;
      heavy_clean_sheet_wins: number;
      clean_sheets: number;
    }>();

    for (const pm of halfSeasonMatchData) {
      const playerId = pm.player_id;
      
      // Skip null player IDs (shouldn't happen)
      if (!playerId) continue;

      let playerStats = halfSeasonStats.get(playerId);
      if (!playerStats) {
        playerStats = {
          player_id: playerId,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals: 0,
          heavy_wins: 0,
          heavy_losses: 0,
          clean_sheet_wins: 0,
          clean_sheet_draws: 0,
          heavy_clean_sheet_wins: 0,
          clean_sheets: 0,
        };
        halfSeasonStats.set(playerId, playerStats);
      }

      playerStats.games += 1;
      playerStats.goals += pm.goals || 0;

      // Results and special cases
      if (pm.result === 'win') {
        playerStats.wins += 1;
        
        if (pm.heavy_win) {
          playerStats.heavy_wins += 1;
        }
        
        if (pm.clean_sheet) {
          playerStats.clean_sheets += 1;
          playerStats.clean_sheet_wins += 1;
          
          if (pm.heavy_win) {
            playerStats.heavy_clean_sheet_wins += 1;
          }
        }
      } else if (pm.result === 'draw') {
        playerStats.draws += 1;
        
        if (pm.clean_sheet) {
          playerStats.clean_sheets += 1;
          playerStats.clean_sheet_draws += 1;
        }
      } else if (pm.result === 'loss') {
        playerStats.losses += 1;
        
        if (pm.heavy_loss) {
          playerStats.heavy_losses += 1;
        }
      }
    }

    // Calculate fantasy points and prepare data for database
    const halfSeasonData: Prisma.aggregated_half_season_statsCreateManyInput[] = [];
    
    for (const [_, stats] of halfSeasonStats) {
      // Calculate fantasy points with the same logic as SQL
      const fantasyPoints = calculateFantasyPoints(
        { wins: stats.wins, draws: stats.draws, losses: stats.losses, heavy_wins: stats.heavy_wins, heavy_losses: stats.heavy_losses, clean_sheet_wins: stats.clean_sheet_wins, clean_sheet_draws: stats.clean_sheet_draws, heavy_clean_sheet_wins: stats.heavy_clean_sheet_wins },
        config
      );

      const winPercentage = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;
      const ppg = stats.games > 0 ? fantasyPoints / stats.games : 0;

      halfSeasonData.push({
        player_id: stats.player_id,
        games_played: stats.games,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goals: stats.goals,
        heavy_wins: stats.heavy_wins,
        heavy_losses: stats.heavy_losses,
        clean_sheets: stats.clean_sheets,
        win_percentage: new Prisma.Decimal(winPercentage.toFixed(1)),
        fantasy_points: fantasyPoints,
        points_per_game: new Prisma.Decimal(ppg.toFixed(1)),
        last_updated: now,
      });
    }

    // ---------------------------------------------------------------------------------
    // FULL SEASON STATS (FOR ALL YEARS)
    // ---------------------------------------------------------------------------------
    console.log('  Calculating stats for all seasons...');

    // Get the earliest and latest years from match dates
    const yearRange = await client.matches.aggregate({
      _min: { match_date: true },
      _max: { match_date: true },
    });

    if (!yearRange._min.match_date || !yearRange._max.match_date) {
      console.log('No matches found for season stats calculation');
      return;
    }

    const startYear = yearRange._min.match_date.getFullYear();
    const endYear = yearRange._max.match_date.getFullYear();
    console.log(`  Processing seasons from ${startYear} to ${endYear}`);

    // Data for all seasons
    const fullSeasonData: Prisma.aggregated_season_statsCreateManyInput[] = [];
    
    // Process each year
    for (let year = startYear; year <= endYear; year++) {
      const season_start = new Date(year, 0, 1); // January 1st
      const season_end = new Date(year, 11, 31); // December 31st

      // Fetch player match data for this season
      const seasonMatchData = await client.player_matches.findMany({
        where: {
          matches: {
            match_date: {
              gte: season_start,
              lte: season_end,
            },
          },
          players: {
            is_ringer: false,
          },
        },
        include: {
          matches: {
            select: { match_date: true },
          },
          players: {
            select: { player_id: true, name: true },
          },
        },
      });

      // Process season stats for this year
      const seasonStats = new Map<number, {
        player_id: number;
        games: number;
        wins: number;
        draws: number;
        losses: number;
        goals: number;
        heavy_wins: number;
        heavy_losses: number;
        clean_sheet_wins: number;
        clean_sheet_draws: number;
        heavy_clean_sheet_wins: number;
        clean_sheets: number;
      }>();

      for (const pm of seasonMatchData) {
        const playerId = pm.player_id;
        
        // Skip null player IDs (shouldn't happen)
        if (!playerId) continue;

        let playerStats = seasonStats.get(playerId);
        if (!playerStats) {
          playerStats = {
            player_id: playerId,
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals: 0,
            heavy_wins: 0,
            heavy_losses: 0,
            clean_sheet_wins: 0,
            clean_sheet_draws: 0,
            heavy_clean_sheet_wins: 0,
            clean_sheets: 0,
          };
          seasonStats.set(playerId, playerStats);
        }

        playerStats.games += 1;
        playerStats.goals += pm.goals || 0;

        // Results and special cases
        if (pm.result === 'win') {
          playerStats.wins += 1;
          
          if (pm.heavy_win) {
            playerStats.heavy_wins += 1;
          }
          
          if (pm.clean_sheet) {
            playerStats.clean_sheets += 1;
            playerStats.clean_sheet_wins += 1;
            
            if (pm.heavy_win) {
              playerStats.heavy_clean_sheet_wins += 1;
            }
          }
        } else if (pm.result === 'draw') {
          playerStats.draws += 1;
          
          if (pm.clean_sheet) {
            playerStats.clean_sheets += 1;
            playerStats.clean_sheet_draws += 1;
          }
        } else if (pm.result === 'loss') {
          playerStats.losses += 1;
          
          if (pm.heavy_loss) {
            playerStats.heavy_losses += 1;
          }
        }
      }

      // Calculate fantasy points and prepare data for database for this year
      for (const [_, stats] of seasonStats) {
        // Calculate fantasy points with the same logic as SQL
        const fantasyPoints = calculateFantasyPoints(
          { wins: stats.wins, draws: stats.draws, losses: stats.losses, heavy_wins: stats.heavy_wins, heavy_losses: stats.heavy_losses, clean_sheet_wins: stats.clean_sheet_wins, clean_sheet_draws: stats.clean_sheet_draws, heavy_clean_sheet_wins: stats.heavy_clean_sheet_wins },
          config
        );

        const winPercentage = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;
        const ppg = stats.games > 0 ? fantasyPoints / stats.games : 0;

        fullSeasonData.push({
          player_id: stats.player_id,
          season_start_date: season_start,
          season_end_date: season_end,
          games_played: stats.games,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goals: stats.goals,
          heavy_wins: stats.heavy_wins,
          heavy_losses: stats.heavy_losses,
          clean_sheets: stats.clean_sheets,
          win_percentage: new Prisma.Decimal(winPercentage.toFixed(1)),
          fantasy_points: fantasyPoints,
          points_per_game: new Prisma.Decimal(ppg.toFixed(1)),
          last_updated: now,
        });
      }
    }

    // Use transaction if provided, or create a new one
    if (tx) {
      // Clear and insert half season stats
      await tx.aggregated_half_season_stats.deleteMany({});
      if (halfSeasonData.length > 0) {
        await tx.aggregated_half_season_stats.createMany({
          data: halfSeasonData,
          skipDuplicates: true,
        });
      }

      // Clear and insert full season stats
      await tx.aggregated_season_stats.deleteMany({});
      if (fullSeasonData.length > 0) {
        await tx.aggregated_season_stats.createMany({
          data: fullSeasonData,
          skipDuplicates: true,
        });
      }
    } else {
      // Create a transaction for the operations using interactive transaction approach
      await prisma.$transaction(async (tx) => {
        await tx.aggregated_half_season_stats.deleteMany({});
        
        if (halfSeasonData.length > 0) {
          await tx.aggregated_half_season_stats.createMany({
            data: halfSeasonData,
            skipDuplicates: true,
          });
        }
        
        await tx.aggregated_season_stats.deleteMany({});
        
        if (fullSeasonData.length > 0) {
          await tx.aggregated_season_stats.createMany({
            data: fullSeasonData,
            skipDuplicates: true,
          });
        }
      }, {
        timeout: 60000 // 60 second timeout for this transaction
      });
    }

    const endTime = Date.now();
    console.log(`updateHalfAndFullSeasonStats completed in ${endTime - startTime}ms.`);
  } catch (error) {
    console.error('Error updating season stats:', error);
    throw error; // Re-throw to caller
  }
} 