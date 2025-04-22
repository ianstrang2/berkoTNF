import { prisma } from '../db';

/**
 * Updates all-time statistics for all players based on their match history.
 * This recreates the logic from the Supabase trigger function 'populate_all_time_stats'.
 * It calculates comprehensive stats and updates the Hall of Fame leaderboards.
 */
export const updateAllTimeStats = async () => {
  try {
    // Get fantasy point configuration values
    const configValues = await prisma.app_config.findMany({
      where: {
        config_key: {
          in: [
            'fantasy_win_points',
            'fantasy_draw_points',
            'fantasy_loss_points',
            'fantasy_heavy_win_points',
            'fantasy_clean_sheet_win_points',
            'fantasy_heavy_clean_sheet_win_points',
            'fantasy_clean_sheet_draw_points',
            'fantasy_heavy_loss_points'
          ]
        }
      },
      select: {
        config_key: true,
        config_value: true
      }
    });

    // Create a map for easy access to configuration values
    const config = new Map();
    configValues.forEach(item => {
      config.set(item.config_key, parseInt(item.config_value, 10));
    });

    // Set default values if configs are missing
    const win_points = config.get('fantasy_win_points') || 20;
    const draw_points = config.get('fantasy_draw_points') || 10;
    const loss_points = config.get('fantasy_loss_points') || -10;
    const heavy_win_points = config.get('fantasy_heavy_win_points') || 30;
    const clean_sheet_win_points = config.get('fantasy_clean_sheet_win_points') || 30;
    const heavy_clean_sheet_win_points = config.get('fantasy_heavy_clean_sheet_win_points') || 40;
    const clean_sheet_draw_points = config.get('fantasy_clean_sheet_draw_points') || 20;
    const heavy_loss_points = config.get('fantasy_heavy_loss_points') || -20;

    // Clear existing all-time stats
    await prisma.aggregated_all_time_stats.deleteMany({});

    // Get all players with their match data
    const players = await prisma.players.findMany({
      where: {
        is_ringer: false
      },
      include: {
        player_matches: {
          include: {
            matches: true
          }
        }
      }
    });

    // Calculate and insert all-time stats for each player
    const allTimeStats = players
      .map(player => {
        if (!player.player_matches || player.player_matches.length === 0) {
          return null;
        }

        const matches = player.player_matches;
        const gamesPlayed = matches.length;
        
        const wins = matches.filter(pm => pm.result === 'win').length;
        const draws = matches.filter(pm => pm.result === 'draw').length;
        const losses = matches.filter(pm => pm.result === 'loss').length;
        const goals = matches.reduce((sum, pm) => sum + (pm.goals || 0), 0);
        const winPercentage = gamesPlayed > 0 ? parseFloat(((wins / gamesPlayed) * 100).toFixed(1)) : 0;
        const minutesPerGoal = goals > 0 ? parseFloat(((gamesPlayed * 60) / goals).toFixed(1)) : null;
        
        const heavyWins = matches.filter(pm => pm.heavy_win === true).length;
        const heavyWinPercentage = gamesPlayed > 0 ? parseFloat(((heavyWins / gamesPlayed) * 100).toFixed(1)) : 0;
        
        const heavyLosses = matches.filter(pm => pm.heavy_loss === true).length;
        const heavyLossPercentage = gamesPlayed > 0 ? parseFloat(((heavyLosses / gamesPlayed) * 100).toFixed(1)) : 0;
        
        // Calculate clean sheets
        const cleanSheets = matches.filter(pm => {
          if (!pm.matches) return false;
          if (pm.team === 'A' && pm.matches.team_b_score === 0) return true;
          if (pm.team === 'B' && pm.matches.team_a_score === 0) return true;
          return false;
        }).length;
        
        const cleanSheetPercentage = gamesPlayed > 0 ? parseFloat(((cleanSheets / gamesPlayed) * 100).toFixed(1)) : 0;
        
        // Calculate fantasy points
        let fantasyPoints = 0;
        
        for (const pm of matches) {
          if (!pm.matches || !pm.result) continue;
          
          // Logic for calculating fantasy points based on match results and conditions
          if (pm.result === 'win') {
            const isCleanSheet = (pm.team === 'A' && pm.matches.team_b_score === 0) || 
                                (pm.team === 'B' && pm.matches.team_a_score === 0);
            
            if (pm.heavy_win && isCleanSheet) {
              fantasyPoints += heavy_clean_sheet_win_points;
            } else if (pm.heavy_win) {
              fantasyPoints += heavy_win_points;
            } else if (isCleanSheet) {
              fantasyPoints += clean_sheet_win_points;
            } else {
              fantasyPoints += win_points;
            }
          } else if (pm.result === 'draw') {
            const isCleanSheet = (pm.team === 'A' && pm.matches.team_b_score === 0) || 
                                (pm.team === 'B' && pm.matches.team_a_score === 0);
            
            if (isCleanSheet) {
              fantasyPoints += clean_sheet_draw_points;
            } else {
              fantasyPoints += draw_points;
            }
          } else if (pm.result === 'loss') {
            if (pm.heavy_loss) {
              fantasyPoints += heavy_loss_points;
            } else {
              fantasyPoints += loss_points;
            }
          }
        }
        
        const pointsPerGame = gamesPlayed > 0 ? parseFloat((fantasyPoints / gamesPlayed).toFixed(1)) : 0;
        
        return {
          player_id: player.player_id,
          games_played: gamesPlayed,
          wins,
          draws,
          losses,
          goals,
          win_percentage: winPercentage,
          minutes_per_goal: minutesPerGoal,
          heavy_wins: heavyWins,
          heavy_win_percentage: heavyWinPercentage,
          heavy_losses: heavyLosses,
          heavy_loss_percentage: heavyLossPercentage,
          clean_sheets: cleanSheets,
          clean_sheet_percentage: cleanSheetPercentage,
          fantasy_points: fantasyPoints,
          points_per_game: pointsPerGame
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    
    // Insert all-time stats
    if (allTimeStats.length > 0) {
      await prisma.aggregated_all_time_stats.createMany({
        data: allTimeStats
      });
    }

    // Update Hall of Fame data
    await prisma.aggregated_hall_of_fame.deleteMany({});
    
    // Most goals all-time
    const mostGoalsPlayers = await prisma.players.findMany({
      where: {
        is_ringer: false,
        player_matches: {
          some: {}
        }
      },
      select: {
        player_id: true,
        _count: {
          select: {
            player_matches: true
          }
        },
        player_matches: {
          select: {
            goals: true
          }
        }
      },
      orderBy: {
        player_matches: {
          _count: 'desc'
        }
      },
      take: 10
    });
    
    // Calculate total goals for each player
    const mostGoalsEntries = mostGoalsPlayers.map(player => {
      const totalGoals = player.player_matches.reduce((sum, match) => sum + (match.goals || 0), 0);
      return {
        category: 'most_goals',
        player_id: player.player_id,
        value: parseFloat(totalGoals.toFixed(2))
      };
    });
    
    // Best win percentage (min 50 games)
    const bestWinPercentagePlayers = await prisma.players.findMany({
      where: {
        is_ringer: false,
        player_matches: {
          some: {}
        }
      },
      include: {
        player_matches: {
          select: {
            result: true
          }
        }
      },
      orderBy: {
        player_matches: {
          _count: 'desc'
        }
      }
    });
    
    const bestWinPercentageEntries = bestWinPercentagePlayers
      .filter(player => player.player_matches && player.player_matches.length >= 50)
      .map(player => {
        if (!player.player_matches) return null;
        const wins = player.player_matches.filter(pm => pm.result === 'win').length;
        const winPercentage = (wins / player.player_matches.length) * 100;
        return {
          category: 'best_win_percentage',
          player_id: player.player_id,
          value: parseFloat(winPercentage.toFixed(2))
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    // Most fantasy points
    const mostFantasyPointsEntries = allTimeStats
      .sort((a, b) => b.fantasy_points - a.fantasy_points)
      .slice(0, 10)
      .map(player => ({
        category: 'most_fantasy_points',
        player_id: player.player_id,
        value: parseFloat(player.fantasy_points.toFixed(2))
      }));
    
    // Combine all Hall of Fame entries and insert
    const hallOfFameEntries = [
      ...mostGoalsEntries,
      ...bestWinPercentageEntries,
      ...mostFantasyPointsEntries
    ];
    
    if (hallOfFameEntries.length > 0) {
      await prisma.aggregated_hall_of_fame.createMany({
        data: hallOfFameEntries
      });
    }
    
    // Update cache metadata
    await prisma.cache_metadata.upsert({
      where: { cache_key: 'all_time_stats' },
      update: { last_invalidated: new Date() },
      create: { 
        cache_key: 'all_time_stats',
        last_invalidated: new Date(),
        dependency_type: 'all_time_stats'
      }
    });
    
    await prisma.cache_metadata.upsert({
      where: { cache_key: 'hall_of_fame' },
      update: { last_invalidated: new Date() },
      create: { 
        cache_key: 'hall_of_fame',
        last_invalidated: new Date(),
        dependency_type: 'hall_of_fame'
      }
    });
    
    console.log('All-time stats and Hall of Fame updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating all-time stats:', error);
    return false;
  }
};

export default updateAllTimeStats; 