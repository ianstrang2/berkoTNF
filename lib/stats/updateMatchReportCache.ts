import { prisma } from '../db';
import { Prisma } from '@prisma/client';
// Use the specified import path for helpers
import { fetchStructuredConfig } from './helpers';
// Assuming AppConfig type might be needed, importing from its likely location
// Import AppConfig type if available and correctly defined
// import { AppConfig } from '../../src/lib/config';

// --- Interfaces ---

interface MilestoneInfo {
    name: string;
    value: number; // Using 'value' to generalize for games or goals
}

/**
 * Updates the cached match report data for the most recent match.
 * Recreates the logic from the Supabase trigger function 'update_match_report_cache'.
 * It precomputes and caches data needed for match reports to improve performance.
 */
export const updateMatchReportCache = async () => {
  try {
    console.time('updateMatchReportCache');

    // --- 1. Fetch Latest Match ---
    const latestMatch = await prisma.matches.findFirst({
      orderBy: {
        match_date: 'desc'
      }
    });

    if (!latestMatch) {
      console.log('No matches found to cache');
      console.timeEnd('updateMatchReportCache');
      return true;
    }
    const latestMatchId = latestMatch.match_id;


    // --- 2. Fetch Configuration ---
    // Using fetchStructuredConfig as requested
    // Use 'any' type to bypass linter issues with potentially mismatched AppConfig/FormattedAppConfig types
    const config: any | null = await fetchStructuredConfig();

    // Handle potential null config return
    if (!config) {
        throw new Error('Failed to fetch application configuration.');
    }

    // Validate required config
    if (config.game_milestone_threshold == null || config.goal_milestone_threshold == null) {
        throw new Error('Missing critical game or goal milestone configuration in fetched config.');
    }
    // Cast to number, assuming the properties exist on the fetched config object
    const gameMilestoneThreshold = config.game_milestone_threshold as number;
    const goalMilestoneThreshold = config.goal_milestone_threshold as number;
    const milestoneConfig = { game_milestone_threshold: gameMilestoneThreshold, goal_milestone_threshold: goalMilestoneThreshold };

     // Prepare config subset to store in the report (for display thresholds)
    const storedConfigValues = {
        game_milestone_threshold: config.game_milestone_threshold,
        goal_milestone_threshold: config.goal_milestone_threshold,
        win_streak_threshold: config.win_streak_threshold ?? 3,
        unbeaten_streak_threshold: config.unbeaten_streak_threshold ?? 5,
        loss_streak_threshold: config.loss_streak_threshold ?? 3,
        winless_streak_threshold: config.winless_streak_threshold ?? 5,
        goal_streak_threshold: config.goal_streak_threshold ?? 3
    };


    // --- 3. Fetch Match Participants ---
    const matchPlayers = await prisma.player_matches.findMany({
      where: {
        match_id: latestMatchId
      },
      include: {
        players: true
      }
    });

    // Get list of player IDs in latest match (for streak calculation)
    const playerIdsInLatestMatch = matchPlayers
      .filter(pm => pm.players && !pm.players.is_ringer)
      .map(pm => pm.players!.player_id)
      .filter((id): id is number => id !== null);


    // --- 4. Prepare Basic Match Info ---
    const teamAPlayers = matchPlayers
      .filter(pm => pm.team === 'A' && pm.players)
      .map(pm => pm.players!.name);

    const teamBPlayers = matchPlayers
      .filter(pm => pm.team === 'B' && pm.players)
      .map(pm => pm.players!.name);

    const teamAScorers = matchPlayers
      .filter(pm => pm.team === 'A' && pm.goals && pm.goals > 0 && pm.players)
      .map(pm => {
        const playerName = pm.players!.name;
        return pm.goals! > 1 ? `${playerName} (${pm.goals})` : playerName;
      })
      .sort()
      .join(', ');

    const teamBScorers = matchPlayers
      .filter(pm => pm.team === 'B' && pm.goals && pm.goals > 0 && pm.players)
      .map(pm => {
        const playerName = pm.players!.name;
        return pm.goals! > 1 ? `${playerName} (${pm.goals})` : playerName;
      })
      .sort()
      .join(', ');


    // --- 5. Calculate Streaks, Milestones & Leaders ---
    // Process streaks for players in latest match
    await calculateStreaksForLatestMatch(playerIdsInLatestMatch);
    
    // Calculate milestones and leaders
    const gameMilestones = await calculateGameMilestones(gameMilestoneThreshold);
    const goalMilestones = await calculateGoalMilestones(goalMilestoneThreshold);
    const leaders = await calculateLeaders();


    // --- 6. Create Aggregated Report ---
    await prisma.aggregated_match_report.deleteMany({});

    await prisma.aggregated_match_report.create({
      data: {
        match_id: latestMatchId,
        match_date: latestMatch.match_date,
        team_a_score: latestMatch.team_a_score,
        team_b_score: latestMatch.team_b_score,
        team_a_players: teamAPlayers as Prisma.JsonArray,
        team_b_players: teamBPlayers as Prisma.JsonArray,
        team_a_scorers: teamAScorers,
        team_b_scorers: teamBScorers,
        config_values: storedConfigValues as unknown as Prisma.JsonObject,
        game_milestones: gameMilestones as unknown as Prisma.JsonArray,
        goal_milestones: goalMilestones as unknown as Prisma.JsonArray,
        // Assign leader data directly or use Prisma.JsonNull
        half_season_goal_leaders: leaders?.half_season_goals ?? Prisma.JsonNull,
        half_season_fantasy_leaders: leaders?.half_season_fantasy ?? Prisma.JsonNull,
        season_goal_leaders: leaders?.season_goals ?? Prisma.JsonNull,
        season_fantasy_leaders: leaders?.season_fantasy ?? Prisma.JsonNull,
        last_updated: new Date()
      }
    });


    // --- 7. Update Cache Metadata ---
    await prisma.cache_metadata.upsert({
      where: { cache_key: 'match_report' },
      update: { last_invalidated: new Date() },
      create: {
        cache_key: 'match_report',
        last_invalidated: new Date(),
        dependency_type: 'match_report'
      }
    });

    console.timeEnd('updateMatchReportCache');
    return true;
  } catch (error) {
    console.error('Error updating match report cache:', error);
    return false;
  }
};


/**
 * Helper function to calculate and update streaks for players in the latest match.
 * Implements the same logic as the SQL function fix_all_streaks().
 */
async function calculateStreaksForLatestMatch(playerIds: number[]): Promise<void> {
    console.log(`Calculating streaks for ${playerIds.length} players...`);
    
    if (playerIds.length === 0) {
        console.log('No players to calculate streaks for.');
        return;
    }
    
    // Reset streaks for players not in the latest match
    await prisma.aggregated_match_streaks.updateMany({
        where: {
            player_id: { notIn: playerIds }
        },
        data: {
            current_win_streak: 0,
            current_loss_streak: 0,
            current_unbeaten_streak: 0,
            current_winless_streak: 0,
            current_scoring_streak: 0,
            goals_in_scoring_streak: 0
        }
    });
    
    // Fetch recent matches for each player (ordered by player_id and match_date desc)
    const recentMatches = await prisma.player_matches.findMany({
        where: {
            player_id: { in: playerIds }
        },
        select: {
            player_id: true,
            goals: true,
            result: true,
            matches: {
                select: { match_date: true }
            }
        },
        orderBy: [
            { player_id: 'asc' },
            { matches: { match_date: 'desc' } }
        ]
    });
    
    // Group matches by player and calculate streaks
    const streaksToUpdate: Record<number, {
        current_win_streak: number;
        current_loss_streak: number;
        current_unbeaten_streak: number;
        current_winless_streak: number;
        current_scoring_streak: number;
        goals_in_scoring_streak: number;
    }> = {};
    
    // Initialize streak object for each player
    playerIds.forEach(pid => {
        streaksToUpdate[pid] = {
            current_win_streak: 0,
            current_loss_streak: 0,
            current_unbeaten_streak: 0,
            current_winless_streak: 0,
            current_scoring_streak: 0,
            goals_in_scoring_streak: 0
        };
    });
    
    // Calculate streaks for each player
    let currentPlayerId = -1;
    let matchCountForPlayer = 0;
    
    for (const match of recentMatches) {
        if (match.player_id == null) continue;
        
        // If we've moved to a new player, reset the match counter
        if (match.player_id !== currentPlayerId) {
            currentPlayerId = match.player_id;
            matchCountForPlayer = 0;
        }
        
        // Only look at the 20 most recent matches per player
        if (matchCountForPlayer >= 20) continue;
        matchCountForPlayer++;
        
        // Ensure we have a streak object for this player
        if (!streaksToUpdate[currentPlayerId]) {
            console.warn(`Player ID ${currentPlayerId} found in recent matches but not in latest match player list. Skipping streak update.`);
            continue;
        }
        
        const playerStreak = streaksToUpdate[currentPlayerId];
        const goals = match.goals ?? 0;
        const result = match.result;
        
        // Update streaks based on match results and goals
        
        // Scoring streak (consecutive matches with at least 1 goal)
        if (matchCountForPlayer === playerStreak.current_scoring_streak + 1 && goals > 0) {
            playerStreak.current_scoring_streak++;
            playerStreak.goals_in_scoring_streak += goals;
        }
        
        // Win streak (consecutive wins)
        if (matchCountForPlayer === playerStreak.current_win_streak + 1 && result === 'win') {
            playerStreak.current_win_streak++;
        }
        
        // Unbeaten streak (consecutive wins or draws)
        if (matchCountForPlayer === playerStreak.current_unbeaten_streak + 1 && result !== 'loss') {
            playerStreak.current_unbeaten_streak++;
        }
        
        // Winless streak (consecutive draws or losses)
        if (matchCountForPlayer === playerStreak.current_winless_streak + 1 && result !== 'win') {
            playerStreak.current_winless_streak++;
        }
        
        // Loss streak (consecutive losses)
        if (matchCountForPlayer === playerStreak.current_loss_streak + 1 && result === 'loss') {
            playerStreak.current_loss_streak++;
        }
    }
    
    // Update the streaks in the database
    console.log('Updating streak records in the database...');
    const updatePromises = playerIds.map(pid => {
        const streak = streaksToUpdate[pid];
        if (!streak) return null;
        
        return prisma.aggregated_match_streaks.upsert({
            where: { player_id: pid },
            update: streak,
            create: {
                player_id: pid,
                ...streak
            }
        });
    }).filter((promise): promise is NonNullable<typeof promise> => promise !== null);
    
    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }
    
    console.log(`Updated streaks for ${updatePromises.length} players.`);
}


/**
 * Helper function to calculate game milestones using the configured threshold.
 */
async function calculateGameMilestones(threshold: number): Promise<MilestoneInfo[]> {
    if (threshold <= 0) return [];

    const players = await prisma.players.findMany({
        where: {
            is_ringer: false,
            player_matches: { some: {} }
        },
        select: {
            name: true,
            _count: { select: { player_matches: true } }
        }
    });

    const milestones = players
        .filter(player => {
            const gameCount = player._count.player_matches;
            return gameCount > 0 && gameCount % threshold === 0;
        })
        .map(player => ({
            name: player.name ?? 'Unknown Player',
            value: player._count.player_matches
        }));

    return milestones;
}


/**
 * Helper function to calculate goal milestones using the configured threshold.
 */
async function calculateGoalMilestones(threshold: number): Promise<MilestoneInfo[]> {
    if (threshold <= 0) return [];

    const playerGoalSums = await prisma.player_matches.groupBy({
        by: ['player_id'],
        _sum: { goals: true },
        where: {
            players: { is_ringer: false },
            goals: { gt: 0 }
        },
        having: {
            goals: {
                 _sum: {
                     gt: 0
                 }
            }
        }
    });

    const playerIds = playerGoalSums.map(p => p.player_id).filter((id): id is number => id !== null);
    const playersInfo = await prisma.players.findMany({
        where: { player_id: { in: playerIds } },
        select: { player_id: true, name: true }
    });
    const playerNamesById = playersInfo.reduce((acc, p) => {
        acc[p.player_id] = p.name ?? `Player ${p.player_id}`;
        return acc;
    }, {} as Record<number, string>);


    const milestones = playerGoalSums
        .map(p => ({
            player_id: p.player_id,
            total_goals: p._sum?.goals ?? 0
        }))
        .filter(p => p.total_goals > 0 && p.total_goals % threshold === 0)
        .map(p => ({
            name: playerNamesById[p.player_id!] ?? `Player ${p.player_id}`,
            value: p.total_goals
        }));


    return milestones;
}


/**
 * Helper function to calculate season and half-season leaders.
 * (Keep existing logic, assuming dependencies are met)
 */
async function calculateLeaders() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isFirstHalf = currentMonth <= 6;
  const seasonStart = new Date(`${currentYear}-01-01`);

  const halfSeasonStats = await prisma.aggregated_half_season_stats.findMany({
    where: {
      player: { is_ringer: false }
    },
    include: { player: { select: { name: true } } },
    orderBy: [{ goals: 'desc' }, { fantasy_points: 'desc' }],
    take: 3
  });

  const seasonStats = await prisma.aggregated_season_stats.findMany({
    where: {
      season_start_date: seasonStart,
      player: { is_ringer: false }
    },
    include: { player: { select: { name: true } } },
    orderBy: [{ goals: 'desc' }, { fantasy_points: 'desc' }],
    take: 3
  });

    const formatLeader = (stats: any[] | null | undefined, valueField: 'goals' | 'fantasy_points') => {
        if (!stats || stats.length === 0) return null;
        const leader = stats[0];
        if (!leader || !leader.player || leader.player.name == null) return null;

        const value = leader[valueField] ?? null;

        return {
            name: leader.player.name,
            value: value,
            runners_up: stats.slice(1).map(p => {
                 const runnerName = p?.player?.name ?? 'Unknown';
                 const runnerValue = p ? (p[valueField] ?? null) : null;
                 return p?.player != null ? { name: runnerName, value: runnerValue } : null;
             }).filter(r => r !== null && r.value != null)
        };
    };

    const formatAndWrapLeader = (stats: any[] | null | undefined, valueField: 'goals' | 'fantasy_points') => {
        const leaderData = formatLeader(stats, valueField);
        // Ensure the result is Prisma.JsonNull or a JSON-compatible object/array
        return leaderData && leaderData.value != null ? [leaderData] : Prisma.JsonNull;
    };


  return {
    half_season_goals: formatAndWrapLeader(halfSeasonStats, 'goals'),
    half_season_fantasy: formatAndWrapLeader(halfSeasonStats, 'fantasy_points'),
    season_goals: formatAndWrapLeader(seasonStats, 'goals'),
    season_fantasy: formatAndWrapLeader(seasonStats, 'fantasy_points')
  };
}

export default updateMatchReportCache; 