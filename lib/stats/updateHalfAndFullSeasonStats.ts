import { prisma } from '../db';
import { Prisma } from '@prisma/client'; // Correct import for Prisma namespace
import { calculateFantasyPointsForMatch, FormattedAppConfig } from './helpers'; // Import helper
import type { player_matches, matches } from '@prisma/client'; // Import types

// Define an interface for the calculated stat objects (can be refined if needed)
interface CalculatedStat {
  player_id: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  heavy_wins: number;
  heavy_losses: number;
  clean_sheets: number;
  win_percentage: number;
  fantasy_points: number;
  points_per_game: number;
}

interface CalculatedSeasonStat extends CalculatedStat {
  season_start_date: Date;
  season_end_date: Date;
}

/**
 * Updates half-season and full-season statistics for all players.
 * This recreates the logic from the Supabase trigger function 'handle_match_update'.
 * It calculates stats based on date periods and handles point calculations using helpers.
 * Optimized to only recalculate historical full seasons if recent match data exists.
 */
export const updateHalfAndFullSeasonStats = async () => {
  try {
    console.time('updateHalfAndFullSeasonStats');

    // Fetch and structure all app config values once
    const configRows = await prisma.app_config.findMany();
    const structuredConfig: FormattedAppConfig = {};
    configRows.forEach(item => {
      if (item.config_key && item.config_value !== null) {
        const numValue = parseFloat(item.config_value);
        structuredConfig[item.config_key] = !isNaN(numValue) ? numValue : item.config_value;
      }
    });

    // Get current date parts for determining half-season and current season
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Define half-season start and end dates (remains hardcoded as requested)
    let halfSeasonStart: Date;
    let halfSeasonEnd: Date;

    if (currentMonth >= 1 && currentMonth <= 6) {
      // First half of year (Jan-Jun)
      halfSeasonStart = new Date(`${currentYear}-01-01`);
      halfSeasonEnd = new Date(`${currentYear}-06-30`);
    } else {
      // Second half of year (Jul-Dec)
      halfSeasonStart = new Date(`${currentYear}-07-01`);
      halfSeasonEnd = new Date(`${currentYear}-12-31`);
    }

    // ----- HALF SEASON STATS -----

    // Get all players with their match data for current half-season
    const halfSeasonPlayerMatches = await prisma.players.findMany({
      where: {
        is_ringer: false,
        player_matches: {
          some: {
            matches: {
              match_date: {
                gte: halfSeasonStart,
                lte: halfSeasonEnd
              }
            }
          }
        }
      },
      include: {
        player_matches: {
          where: {
            matches: {
              match_date: {
                gte: halfSeasonStart,
                lte: halfSeasonEnd
              }
            }
          },
          include: {
            matches: true // Ensure matches data is included for point calculation
          }
        }
      }
    });

    // Calculate half-season stats for each player
    const halfSeasonStatsPromises = halfSeasonPlayerMatches.map(async (player) => {
      const matches = player.player_matches;

      if (matches.length === 0) return null;

      // Basic counts
      const games = matches.length;
      const wins = matches.filter(pm => pm.result === 'win').length;
      const draws = matches.filter(pm => pm.result === 'draw').length;
      const losses = matches.filter(pm => pm.result === 'loss').length;
      const totalGoals = matches.reduce((sum, pm) => sum + (pm.goals || 0), 0);

      // Special case counts
      const heavyWins = matches.filter(pm => pm.heavy_win === true).length;
      const heavyLosses = matches.filter(pm => pm.heavy_loss === true).length;

      // Clean sheet counts (logic remains similar, relies on included matches data)
       const cleanSheets = matches.filter(pm => {
         if (!pm.matches) return false;
         return (pm.team === 'A' && pm.matches.team_b_score === 0) ||
                (pm.team === 'B' && pm.matches.team_a_score === 0);
       }).length;

      // Calculate fantasy points using the helper function for each match
      let totalFantasyPoints = 0;
      for (const pm of matches) {
        // Explicitly type pm to ensure matches is accessible
        const playerMatchWithMatch = pm as player_matches & { matches: matches | null };
        totalFantasyPoints += calculateFantasyPointsForMatch(playerMatchWithMatch, structuredConfig);
      }

      // Calculate win percentage and points per game
      const winPercentage = games > 0 ? parseFloat(((wins / games) * 100).toFixed(1)) : 0;
      const pointsPerGame = games > 0 ? parseFloat((totalFantasyPoints / games).toFixed(1)) : 0; // Use totalFantasyPoints

      return {
        player_id: player.player_id,
        games_played: games,
        wins,
        draws,
        losses,
        goals: totalGoals,
        heavy_wins: heavyWins,
        heavy_losses: heavyLosses,
        clean_sheets: cleanSheets,
        win_percentage: winPercentage,
        fantasy_points: totalFantasyPoints, // Use calculated total
        points_per_game: pointsPerGame
      };
    });

    // Resolve all promises and filter out nulls
    const halfSeasonStats = (await Promise.all(halfSeasonStatsPromises))
        .filter((item): item is CalculatedStat => item !== null);

    // ----- FULL SEASON STATS -----

    // Get min/max year only once
    const yearRange = await prisma.$queryRaw<{ min_year: number, max_year: number }[]>`
      SELECT
        EXTRACT(YEAR FROM MIN(match_date))::integer AS min_year,
        EXTRACT(YEAR FROM MAX(match_date))::integer AS max_year
      FROM matches
    `;

    if (yearRange.length === 0 || !yearRange[0].min_year || !yearRange[0].max_year) {
      console.log('No match data found for full season stats');
      console.timeEnd('updateHalfAndFullSeasonStats');
      return true; // Exit early if no matches
    }

    const startYear = yearRange[0].min_year;
    const endYear = yearRange[0].max_year; // This is the latest year with data

    // Date 14 days ago for historical optimization check
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(currentDate.getDate() - 14);

    const allSeasonStats: CalculatedSeasonStat[] = []; // Explicitly type the array

    // Loop through each year from start to end
    for (let year = startYear; year <= endYear; year++) {
      const seasonStart = new Date(`${year}-01-01`);
      const seasonEnd = new Date(`${year}-12-31`);

      // Optimization: Only process historical years if recent updates occurred
      if (year !== currentYear) {
        const recentUpdates = await prisma.player_matches.findFirst({
          where: {
            updated_at: { gte: fourteenDaysAgo }, // Use the verified field
            matches: {
              match_date: {
                gte: seasonStart,
                lte: seasonEnd
              }
            }
          },
          select: { player_match_id: true } // Just need to know if one exists
        });

        if (!recentUpdates) {
          console.log(`Skipping full season calculation for ${year} - no recent player_match updates.`);
          continue; // Skip to the next year
        }
         console.log(`Processing full season calculation for ${year} due to recent updates.`);
      } else {
         console.log(`Processing full season calculation for current year ${year}.`);
      }


      // Get match data for this season (query remains similar)
      const seasonPlayerMatches = await prisma.players.findMany({
        where: {
          is_ringer: false,
          player_matches: {
            some: {
              matches: {
                match_date: {
                  gte: seasonStart,
                  lte: seasonEnd
                }
              }
            }
          }
        },
        include: {
          player_matches: {
            where: {
              matches: {
                match_date: {
                  gte: seasonStart,
                  lte: seasonEnd
                }
              }
            },
            include: {
              matches: true // Ensure matches data is included
            }
          }
        }
      });

      // Calculate season stats for each player for the current year iteration
      const seasonStatsPromises = seasonPlayerMatches.map(async (player) => {
        const matches = player.player_matches;

        if (matches.length === 0) return null;

        // Basic counts
        const games = matches.length;
        const wins = matches.filter(pm => pm.result === 'win').length;
        const draws = matches.filter(pm => pm.result === 'draw').length;
        const losses = matches.filter(pm => pm.result === 'loss').length;
        const totalGoals = matches.reduce((sum, pm) => sum + (pm.goals || 0), 0);

        // Special case counts
        const heavyWins = matches.filter(pm => pm.heavy_win === true).length;
        const heavyLosses = matches.filter(pm => pm.heavy_loss === true).length;

        // Clean sheet counts
        const cleanSheets = matches.filter(pm => {
           if (!pm.matches) return false;
           return (pm.team === 'A' && pm.matches.team_b_score === 0) ||
                  (pm.team === 'B' && pm.matches.team_a_score === 0);
        }).length;

        // Calculate fantasy points using the helper function
        let totalFantasyPoints = 0;
        for (const pm of matches) {
           const playerMatchWithMatch = pm as player_matches & { matches: matches | null };
           totalFantasyPoints += calculateFantasyPointsForMatch(playerMatchWithMatch, structuredConfig);
        }

        // Calculate win percentage and points per game
        const winPercentage = games > 0 ? parseFloat(((wins / games) * 100).toFixed(1)) : 0;
        const pointsPerGame = games > 0 ? parseFloat((totalFantasyPoints / games).toFixed(1)) : 0;

        return {
          player_id: player.player_id,
          season_start_date: seasonStart,
          season_end_date: seasonEnd,
          games_played: games,
          wins,
          draws,
          losses,
          goals: totalGoals,
          heavy_wins: heavyWins,
          heavy_losses: heavyLosses,
          clean_sheets: cleanSheets,
          win_percentage: winPercentage,
          fantasy_points: totalFantasyPoints,
          points_per_game: pointsPerGame
        };
      });

       // Resolve promises for the current season and filter nulls
       const seasonStats = (await Promise.all(seasonStatsPromises))
           .filter((item): item is CalculatedSeasonStat => item !== null);

       // Add the calculated stats for this year to the main list
       allSeasonStats.push(...seasonStats);
    } // End of year loop

    // ----- Database Updates (Bulk Upserts) -----

    const upsertOperations: Prisma.PrismaPromise<any>[] = []; // Explicitly type the array

    // Prepare Half Season Upserts
    upsertOperations.push(...halfSeasonStats.map(stats =>
      prisma.aggregated_half_season_stats.upsert({
        where: { player_id: stats.player_id },
        update: {
          games_played: stats.games_played,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goals: stats.goals,
          heavy_wins: stats.heavy_wins,
          heavy_losses: stats.heavy_losses,
          clean_sheets: stats.clean_sheets,
          win_percentage: stats.win_percentage,
          fantasy_points: stats.fantasy_points,
          points_per_game: stats.points_per_game,
          last_updated: currentDate // Use consistent timestamp
        },
        create: {
          player_id: stats.player_id,
          games_played: stats.games_played,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goals: stats.goals,
          heavy_wins: stats.heavy_wins,
          heavy_losses: stats.heavy_losses,
          clean_sheets: stats.clean_sheets,
          win_percentage: stats.win_percentage,
          fantasy_points: stats.fantasy_points,
          points_per_game: stats.points_per_game,
          last_updated: currentDate // Use consistent timestamp
        }
      })
    ));

    // Prepare Full Season Upserts (from all processed years)
    upsertOperations.push(...allSeasonStats.map(stats =>
      prisma.aggregated_season_stats.upsert({
        where: {
          player_id_season_start_date_season_end_date: {
            player_id: stats.player_id,
            season_start_date: stats.season_start_date,
            season_end_date: stats.season_end_date
          }
        },
        update: {
          games_played: stats.games_played,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goals: stats.goals,
          heavy_wins: stats.heavy_wins,
          heavy_losses: stats.heavy_losses,
          clean_sheets: stats.clean_sheets,
          win_percentage: stats.win_percentage,
          fantasy_points: stats.fantasy_points,
          points_per_game: stats.points_per_game,
          last_updated: currentDate // Use consistent timestamp
        },
        create: {
          player_id: stats.player_id,
          season_start_date: stats.season_start_date,
          season_end_date: stats.season_end_date,
          games_played: stats.games_played,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goals: stats.goals,
          heavy_wins: stats.heavy_wins,
          heavy_losses: stats.heavy_losses,
          clean_sheets: stats.clean_sheets,
          win_percentage: stats.win_percentage,
          fantasy_points: stats.fantasy_points,
          points_per_game: stats.points_per_game,
          last_updated: currentDate // Use consistent timestamp
        }
      })
    ));

    // Prepare Cache Metadata Upserts
     upsertOperations.push(
       prisma.cache_metadata.upsert({
         where: { cache_key: 'half_season_stats' },
         update: { last_invalidated: currentDate },
         create: {
           cache_key: 'half_season_stats',
           last_invalidated: currentDate,
           dependency_type: 'half_season_stats' // Assuming this type exists
         }
       })
     );
     upsertOperations.push(
       prisma.cache_metadata.upsert({
         where: { cache_key: 'season_stats' },
         update: { last_invalidated: currentDate },
         create: {
           cache_key: 'season_stats',
           last_invalidated: currentDate,
           dependency_type: 'season_stats' // Assuming this type exists
         }
       })
     );

    // Execute all upserts in a single transaction
    if (upsertOperations.length > 0) {
        console.log(`Performing bulk upsert of ${upsertOperations.length} operations...`);
        await prisma.$transaction(upsertOperations);
        console.log(`Bulk upsert completed.`);
    } else {
        console.log("No stats updates to perform.");
    }


    console.timeEnd('updateHalfAndFullSeasonStats');
    return true;
  } catch (error) {
    console.error('Error updating half and full season stats:', error);
    // Log more details if possible, e.g., which part failed
    return false;
  }
};

export default updateHalfAndFullSeasonStats; 