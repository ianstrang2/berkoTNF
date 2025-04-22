import { prisma } from '../prisma';
import { Prisma, PrismaClient } from '@prisma/client';
// Import AppConfig and getAppConfig from the correct file
import { AppConfig, getAppConfig } from '@/lib/config';
// Import from the correct location and use existing exports
import { calculateFantasyPointsForMatch } from './helpers';

// --- Interfaces ---

interface Milestone {
  name: string;
  value: number;
}

/**
 * Updates the cached match report and player streaks for the most recent match.
 * Replicates logic from Supabase functions 'fix_all_milestones' and 'fix_all_streaks'.
 * Stores milestones and leaders in aggregated_match_report and updates streaks in aggregated_match_streaks.
 * 
 * @param tx Optional transaction client
 */
export const updateMatchReportCache = async (
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) => {
  try {
    console.time('updateMatchReportCache');

    // Use provided transaction client or fall back to global prisma client
    const client = tx || prisma;

    // --- 1. Fetch Latest Match ---
    const latestMatch = await client.matches.findFirst({
      orderBy: { match_date: 'desc' }
    });

    if (!latestMatch) {
      console.log('No matches found. Skipping cache update.');
      console.timeEnd('updateMatchReportCache');
      return true;
    }
    const latestMatchId = latestMatch.match_id;

    // --- 2. Fetch Configuration using Helper ---
    const config: AppConfig = await getAppConfig();

    // Validate critical config keys needed for milestones
    if (config.game_milestone_threshold == null || config.goal_milestone_threshold == null) {
        throw new Error('Missing critical game or goal milestone configuration in fetched config.');
    }
    // Prepare numeric config specifically for milestone calculation
    const milestoneConfig = {
        game_milestone_threshold: config.game_milestone_threshold as number,
        goal_milestone_threshold: config.goal_milestone_threshold as number
    };

    // Prepare config subset to store in the report (for display thresholds)
    // Use nullish coalescing for potentially optional streak thresholds from AppConfig
    const storedConfigValues = {
        game_milestone_threshold: config.game_milestone_threshold,
        goal_milestone_threshold: config.goal_milestone_threshold,
        win_streak_threshold: config.win_streak_threshold ?? 3,
        unbeaten_streak_threshold: config.unbeaten_streak_threshold ?? 5,
        loss_streak_threshold: config.loss_streak_threshold ?? 3,
        winless_streak_threshold: config.winless_streak_threshold ?? 5,
        goal_streak_threshold: config.goal_streak_threshold ?? 3
    };


    // --- 3. Fetch Match Participants (IDs and Names) ---
    const matchPlayers = await client.player_matches.findMany({
      where: { match_id: latestMatchId },
      include: {
        players: { select: { player_id: true, name: true, is_ringer: true } }
      }
    });

    const playerIdsInLatestMatch = matchPlayers
      .filter(pm => pm.players && !pm.players.is_ringer)
      .map(pm => pm.players!.player_id);

    const playerNamesById = matchPlayers.reduce((acc, pm) => {
        if (pm.players?.player_id != null && pm.players.name != null) {
            acc[pm.players.player_id] = pm.players.name;
        }
        return acc;
    }, {} as Record<number, string>);


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
        }).sort().join(', ');
    const teamBScorers = matchPlayers
            .filter(pm => pm.team === 'B' && pm.goals && pm.goals > 0 && pm.players)
        .map(pm => {
            const playerName = pm.players!.name;
            return pm.goals! > 1 ? `${playerName} (${pm.goals})` : playerName;
        }).sort().join(', ');

    // --- 5. Process Updates ---
    // If using passed transaction, work with it directly
    // Otherwise create our own transaction
    if (tx) {
      console.log(`  Updating streaks for players in match ${latestMatchId}...`);
      await updatePlayerStreaks(tx, playerIdsInLatestMatch, playerNamesById);

      console.log(`  Calculating milestones for match ${latestMatchId}...`);
      const { gameMilestones, goalMilestones } = await calculateMilestones(
          tx,
          playerIdsInLatestMatch,
          milestoneConfig,
          playerNamesById
      );

      console.log(`  Clearing old aggregated_match_report...`);
      await tx.aggregated_match_report.deleteMany({});

      console.log(`  Creating new aggregated_match_report for match ${latestMatchId}...`);
      const leaders = await calculateLeaders(tx);

      await tx.aggregated_match_report.create({
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
              // Leader fields included
              half_season_goal_leaders: leaders?.half_season_goals
                  ? leaders.half_season_goals as unknown as Prisma.InputJsonValue
                  : undefined,
              half_season_fantasy_leaders: leaders?.half_season_fantasy
                  ? leaders.half_season_fantasy as unknown as Prisma.InputJsonValue
                  : undefined,
              season_goal_leaders: leaders?.season_goals
                  ? leaders.season_goals as unknown as Prisma.InputJsonValue
                  : undefined,
              season_fantasy_leaders: leaders?.season_fantasy
                  ? leaders.season_fantasy as unknown as Prisma.InputJsonValue
                  : undefined,
              last_updated: new Date()
          }
      });

      console.log(`  Updating cache_metadata...`);
      await tx.cache_metadata.upsert({
          where: { cache_key: 'match_report' },
          update: { last_invalidated: new Date() },
          create: {
              cache_key: 'match_report',
              last_invalidated: new Date(),
              dependency_type: 'match_report'
          }
      });
    } else {
      // --- 5. Transaction for Atomic Updates ---
      await prisma.$transaction(async (innerTx) => {
        console.log(`  Updating streaks for players in match ${latestMatchId}...`);
        await updatePlayerStreaks(innerTx, playerIdsInLatestMatch, playerNamesById);

        console.log(`  Calculating milestones for match ${latestMatchId}...`);
        const { gameMilestones, goalMilestones } = await calculateMilestones(
            innerTx,
            playerIdsInLatestMatch,
            milestoneConfig,
            playerNamesById
        );

        console.log(`  Clearing old aggregated_match_report...`);
        await innerTx.aggregated_match_report.deleteMany({});

        console.log(`  Creating new aggregated_match_report for match ${latestMatchId}...`);
        const leaders = await calculateLeaders(innerTx);

        await innerTx.aggregated_match_report.create({
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
                // Leader fields included
                half_season_goal_leaders: leaders?.half_season_goals
                    ? leaders.half_season_goals as unknown as Prisma.InputJsonValue
                    : undefined,
                half_season_fantasy_leaders: leaders?.half_season_fantasy
                    ? leaders.half_season_fantasy as unknown as Prisma.InputJsonValue
                    : undefined,
                season_goal_leaders: leaders?.season_goals
                    ? leaders.season_goals as unknown as Prisma.InputJsonValue
                    : undefined,
                season_fantasy_leaders: leaders?.season_fantasy
                    ? leaders.season_fantasy as unknown as Prisma.InputJsonValue
                    : undefined,
                last_updated: new Date()
            }
        });

        console.log(`  Updating cache_metadata...`);
        await innerTx.cache_metadata.upsert({
            where: { cache_key: 'match_report' },
            update: { last_invalidated: new Date() },
            create: {
                cache_key: 'match_report',
                last_invalidated: new Date(),
                dependency_type: 'match_report'
            }
        });
      });
    }

    console.timeEnd('updateMatchReportCache');
    return true;

    } catch (error) {
        console.error('Error updating match report cache:', error);
        return false;
  }
};

// ==================================
// == Helper Functions =============
// ==================================

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

async function updatePlayerStreaks(
    tx: PrismaTx,
    playerIdsInLatestMatch: number[],
    playerNamesById: Record<number, string>
): Promise<void> {
    console.log('    Resetting streaks for players not in the latest match...');
    await tx.aggregated_match_streaks.updateMany({
        where: {
            player_id: { notIn: playerIdsInLatestMatch }
        },
        data: {
            current_win_streak: 0,
            current_unbeaten_streak: 0,
            current_winless_streak: 0,
            current_loss_streak: 0,
            current_scoring_streak: 0,
            goals_in_scoring_streak: 0
        }
    });

    if (playerIdsInLatestMatch.length === 0) {
        console.log('    No players in the latest match to update streaks for.');
        return;
    }

    console.log('    Fetching recent match history for streak calculation...');
    const recentMatches = await tx.player_matches.findMany({
        where: {
            player_id: { in: playerIdsInLatestMatch }
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
        ],
    });

    const streaksToUpdate: Record<number, {
        current_win_streak: number;
        current_unbeaten_streak: number;
        current_winless_streak: number;
        current_loss_streak: number;
        current_scoring_streak: number;
        goals_in_scoring_streak: number;
    }> = {};

    playerIdsInLatestMatch.forEach(pid => {
        streaksToUpdate[pid] = {
            current_win_streak: 0,
            current_unbeaten_streak: 0,
            current_winless_streak: 0,
            current_loss_streak: 0,
            current_scoring_streak: 0,
            goals_in_scoring_streak: 0
        };
    });

    let currentPlayerId = -1;
    let matchCountForPlayer = 0;

    for (const pm of recentMatches) {
        if (pm.player_id == null) {
            console.warn('Skipping player_match record with null player_id in streak calculation');
            continue;
        }

        if (pm.player_id !== currentPlayerId) {
            currentPlayerId = pm.player_id;
            matchCountForPlayer = 0;
        }
        if (matchCountForPlayer >= 20) {
            continue;
        }
        matchCountForPlayer++;

        if (!streaksToUpdate[currentPlayerId]) {
            console.warn(`Player ID ${currentPlayerId} found in recent matches but not in latest match player list. Skipping streak update for this player.`);
            continue;
        }

        const playerStreak = streaksToUpdate[currentPlayerId];
        const goals = pm.goals ?? 0;
        const result = pm.result;

        if (matchCountForPlayer === playerStreak.current_scoring_streak + 1 && goals > 0) {
            playerStreak.current_scoring_streak++;
            playerStreak.goals_in_scoring_streak = (playerStreak.goals_in_scoring_streak ?? 0) + (goals ?? 0);
        }
        if (matchCountForPlayer === playerStreak.current_win_streak + 1 && result === 'win') {
            playerStreak.current_win_streak++;
        }
        if (matchCountForPlayer === playerStreak.current_unbeaten_streak + 1 && result !== 'loss') {
            playerStreak.current_unbeaten_streak++;
        }
        if (matchCountForPlayer === playerStreak.current_winless_streak + 1 && result !== 'win') {
            playerStreak.current_winless_streak++;
        }
        if (matchCountForPlayer === playerStreak.current_loss_streak + 1 && result === 'loss') {
            playerStreak.current_loss_streak++;
        }
    }

    console.log('    Updating aggregated_match_streaks table...');
    const updatePromises = playerIdsInLatestMatch.map(pid => {
        const streakData = streaksToUpdate[pid];
        if (!streakData) return null;

        return tx.aggregated_match_streaks.upsert({
            where: { player_id: pid },
            update: streakData,
            create: {
                player_id: pid,
                ...streakData
            }
        });
    }).filter(promise => promise !== null);

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    console.log(`    Finished updating streaks for ${updatePromises.length} players.`);
}

async function calculateMilestones(
  tx: PrismaTx,
  playerIds: number[],
  config: { game_milestone_threshold: number; goal_milestone_threshold: number },
  playerNamesById: Record<number, string>
): Promise<{ gameMilestones: Milestone[], goalMilestones: Milestone[] }> {

  if (playerIds.length === 0) {
      return { gameMilestones: [], goalMilestones: [] };
  }

  const gameMilestoneThreshold = config.game_milestone_threshold;
  const goalMilestoneThreshold = config.goal_milestone_threshold;

  // Get total games for all players, not just those in the latest match
  const gameCounts = await tx.player_matches.groupBy({
    by: ['player_id'],
    where: {
      player_id: { in: playerIds },
    },
    _count: {
      match_id: true
    },
  });

  // Get total goals for all players, not just those in the latest match
  const goalCounts = await tx.player_matches.groupBy({
      by: ['player_id'],
      where: {
          player_id: { in: playerIds },
      },
      _sum: {
          goals: true
      },
  });

  const gameMilestones = gameCounts
    .filter(gc => gc.player_id != null)
    .map(gc => ({
      player_id: gc.player_id!,
      total_games: gc._count.match_id
    }))
    .filter(p => p.total_games > 0 && p.total_games % gameMilestoneThreshold === 0)
    .map(p => ({
      name: playerNamesById[p.player_id] ?? `Player ${p.player_id}`,
      value: p.total_games
    }));

  const goalMilestones = goalCounts
    .filter(gc => gc.player_id != null && gc._sum.goals != null && gc._sum.goals > 0)
    .map(gc => ({
      player_id: gc.player_id!,
      total_goals: gc._sum.goals ?? 0
    }))
    .filter(p => p.total_goals > 0 && p.total_goals % goalMilestoneThreshold === 0)
    .map(p => ({
      name: playerNamesById[p.player_id] ?? `Player ${p.player_id}`,
      value: p.total_goals
    }));

  return { gameMilestones, goalMilestones };
}

async function calculateLeaders(tx: PrismaTx) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isFirstHalf = currentMonth <= 6;
    const seasonStart = new Date(`${currentYear}-01-01`);

    // Separate queries for goals leaders and fantasy points leaders
    const halfSeasonGoalLeaders = await tx.aggregated_half_season_stats.findMany({
        where: {
            player: { is_ringer: false }
        },
        include: { player: { select: { name: true, player_id: true } } },
        orderBy: [{ goals: 'desc' }],
        take: 3
    });

    const halfSeasonFantasyLeaders = await tx.aggregated_half_season_stats.findMany({
        where: {
            player: { is_ringer: false }
        },
        include: { player: { select: { name: true, player_id: true } } },
        orderBy: [{ fantasy_points: 'desc' }],
        take: 3
    });

    const seasonGoalLeaders = await tx.aggregated_season_stats.findMany({
        where: {
            season_start_date: seasonStart,
            player: { is_ringer: false }
        },
        include: { player: { select: { name: true, player_id: true } } },
        orderBy: [{ goals: 'desc' }],
        take: 3
    });

    const seasonFantasyLeaders = await tx.aggregated_season_stats.findMany({
        where: {
            season_start_date: seasonStart,
            player: { is_ringer: false }
        },
        include: { player: { select: { name: true, player_id: true } } },
        orderBy: [{ fantasy_points: 'desc' }],
        take: 3
    });

    const formatLeader = (stats: any[] | null | undefined, valueField: 'goals' | 'fantasy_points') => {
        if (!stats || stats.length === 0) return null;
        const leader = stats[0];
        if (!leader || !leader.player || leader.player.player_id == null || leader.player.name == null) return null;

        const value = leader[valueField] ?? null;

        return {
            name: leader.player.name,
            value: value,
            runners_up: stats.slice(1).map(p => {
                 const runnerName = p?.player?.name ?? 'Unknown';
                 const runnerValue = p ? (p[valueField] ?? null) : null;
                 return p?.player?.player_id != null ? { name: runnerName, value: runnerValue } : null;
             }).filter(r => r !== null)
        };
    };

    const formatAndWrapLeader = (stats: any[] | null | undefined, valueField: 'goals' | 'fantasy_points') => {
        const leaderData = formatLeader(stats, valueField);
        return leaderData && leaderData.value != null ? [leaderData] : null;
    };

    return {
        half_season_goals: formatAndWrapLeader(halfSeasonGoalLeaders, 'goals'),
        half_season_fantasy: formatAndWrapLeader(halfSeasonFantasyLeaders, 'fantasy_points'),
        season_goals: formatAndWrapLeader(seasonGoalLeaders, 'goals'),
        season_fantasy: formatAndWrapLeader(seasonFantasyLeaders, 'fantasy_points')
    };
}

export default updateMatchReportCache;
