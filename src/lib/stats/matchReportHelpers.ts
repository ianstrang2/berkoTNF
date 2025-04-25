import { Prisma } from '@prisma/client';
import { AppConfig } from '../config';
import { prisma } from '../prisma';

/**
 * Interface for player match history used in streak calculations.
 */
interface PlayerMatchHistory {
    player_id: number;
    match_date: Date;
    goals: number | null;
    result: string | null;
}

/**
 * Updates current streaks (win, loss, unbeaten, winless, scoring)
 * in the aggregated_match_streaks table based on the latest match.
 * Mimics the logic of the fix_all_streaks SQL function.
 *
 * @param {number} latestMatchId - The ID of the most recently processed match.
 * @param {AppConfig} config - Application configuration (potentially needed for thresholds later, though not used in SQL version).
 */
export async function updateMatchStreaks(latestMatchId: number, config: AppConfig): Promise<void> {
    console.log(`Starting updateMatchStreaks for match ID: ${latestMatchId}...`);
    const startTime = Date.now();

    try {
        // Get players who played in the latest match
        const playersInLatestMatch = await prisma.player_matches.findMany({
            where: { match_id: latestMatchId },
            select: { player_id: true },
            distinct: ['player_id'],
        });
        const playerIdsInLatestMatch = playersInLatestMatch.map(p => p.player_id).filter(id => id !== null) as number[];

        if (playerIdsInLatestMatch.length === 0) {
            console.log("No players found in the latest match. Skipping streak updates.");
            return;
        }

        // Reset streaks for players *not* in the latest match
        await prisma.aggregated_match_streaks.updateMany({
            where: {
                player_id: {
                    notIn: playerIdsInLatestMatch,
                },
            },
            data: {
                current_win_streak: 0,
                current_unbeaten_streak: 0,
                current_winless_streak: 0,
                current_loss_streak: 0,
                current_scoring_streak: 0,
                goals_in_scoring_streak: 0,
            },
        });

        // Fetch relevant match history for players in the latest match (limited lookback like SQL)
        const lookbackLimit = 20; // Match the SQL function's limit
        const playersHistoryData = await prisma.player_matches.findMany({
            where: {
                player_id: { in: playerIdsInLatestMatch },
                players: {
                    is_ringer: false,
                    is_retired: false,
                },
            },
            include: {
                matches: {
                    select: { match_date: true },
                },
            },
            orderBy: {
                matches: {
                    match_date: 'desc',
                },
            },
            // Fetch slightly more than needed per player initially, then limit in code
             take: playerIdsInLatestMatch.length * (lookbackLimit + 5), // Heuristic buffer
        });

        const streaksToUpdate: Prisma.aggregated_match_streaksUpsertArgs[] = [];

        // Process streaks for each player
        for (const playerId of playerIdsInLatestMatch) {
            const playerHistory = playersHistoryData
                .filter(pm => pm.player_id === playerId && pm.matches?.match_date)
                .sort((a, b) => (b.matches?.match_date?.getTime() ?? 0) - (a.matches?.match_date?.getTime() ?? 0))
                .slice(0, lookbackLimit) // Apply lookback limit per player
                .map(pm => ({ // Map to simpler structure
                    player_id: pm.player_id as number,
                    match_date: pm.matches?.match_date as Date,
                    goals: pm.goals,
                    result: pm.result,
                }));

            if (playerHistory.length === 0) continue;

            // Calculate streaks based on the player's recent history
            const scoringStreak = calculateCurrentStreak(playerHistory, (match) => (match.goals ?? 0) > 0);
            const winStreak = calculateCurrentStreak(playerHistory, (match) => match.result === 'win');
            const unbeatenStreak = calculateCurrentStreak(playerHistory, (match) => match.result !== 'loss');
            const winlessStreak = calculateCurrentStreak(playerHistory, (match) => match.result !== 'win');
            const lossStreak = calculateCurrentStreak(playerHistory, (match) => match.result === 'loss');

            const goalsInScoringStreak = playerHistory
                .slice(0, scoringStreak)
                .reduce((sum, match) => sum + (match.goals ?? 0), 0);

            const upsertData: Prisma.aggregated_match_streaksUncheckedCreateInput = {
                player_id: playerId,
                current_win_streak: winStreak,
                current_unbeaten_streak: unbeatenStreak,
                current_winless_streak: winlessStreak,
                current_loss_streak: lossStreak,
                current_scoring_streak: scoringStreak,
                goals_in_scoring_streak: goalsInScoringStreak,
                last_updated: new Date(),
            };

            streaksToUpdate.push({
                where: { player_id: playerId },
                create: upsertData,
                update: upsertData, // Use same data for update fields
            });
        }

        // Execute upserts in a transaction
        if (streaksToUpdate.length > 0) {
             await prisma.$transaction(
                 streaksToUpdate.map(args => prisma.aggregated_match_streaks.upsert(args))
             );
        }

        const endTime = Date.now();
        console.log(`updateMatchStreaks completed in ${endTime - startTime}ms for ${playerIdsInLatestMatch.length} players.`);

    } catch (error) {
        console.error(`Error updating match streaks for match ID ${latestMatchId}:`, error);
        throw error;
    }
}

/**
 * Helper function to calculate the length of the current streak based on a condition.
 * Iterates backwards from the most recent match.
 * @param history Sorted player match history (most recent first).
 * @param condition Function defining the condition for the streak to continue.
 * @returns Length of the current streak.
 */
function calculateCurrentStreak(
    history: PlayerMatchHistory[],
    condition: (match: PlayerMatchHistory) => boolean
): number {
    let streakLength = 0;
    for (const match of history) {
        if (condition(match)) {
            streakLength++;
        } else {
            break; // Streak broken
        }
    }
    return streakLength;
}

/**
 * Updates game and goal milestones in the aggregated_match_report table
 * for players who played in the latest match.
 * Mimics the logic of the fix_all_milestones SQL function.
 *
 * @param {number} latestMatchId - The ID of the most recently processed match.
 * @param {AppConfig} config - Application configuration containing milestone thresholds.
 */
export async function updateMatchMilestones(latestMatchId: number, config: AppConfig): Promise<void> {
     console.log(`Starting updateMatchMilestones for match ID: ${latestMatchId}...`);
     const startTime = Date.now();

     try {
        // Get milestone thresholds from config, providing defaults
        const gameThreshold = (config.game_milestone_threshold ?? 50) as number;
        const goalThreshold = (config.goal_milestone_threshold ?? 50) as number;

        // Get players who played in the latest match
        const playersInLatestMatch = await prisma.player_matches.findMany({
            where: { match_id: latestMatchId },
            select: { player_id: true },
            distinct: ['player_id'],
        });
        const playerIdsInLatestMatch = playersInLatestMatch.map(p => p.player_id).filter(id => id !== null) as number[];

        if (playerIdsInLatestMatch.length === 0) {
            console.log("No players found in the latest match. Skipping milestone updates.");
            return;
        }

        // Fetch total games and goals for these players
        const playerStats = await prisma.players.findMany({
            where: {
                player_id: { in: playerIdsInLatestMatch },
                is_ringer: false, // Only non-ringers
            },
            select: {
                player_id: true,
                name: true,
                _count: {
                    select: { player_matches: true }, // Counts games played
                },
                player_matches: {
                    select: { goals: true }, // Select goals to sum them manually
                },
            },
        });

        const gameMilestones: { name: string | null; total_games: number }[] = [];
        const goalMilestones: { name: string | null; total_goals: number }[] = [];

        for (const player of playerStats) {
            const totalGames = player._count.player_matches;
            const totalGoals = player.player_matches.reduce((sum, pm) => sum + (pm.goals ?? 0), 0);

            // Check game milestones
            if (totalGames > 0 && totalGames % gameThreshold === 0) {
                gameMilestones.push({ name: player.name, total_games: totalGames });
            }

            // Check goal milestones
            if (totalGoals > 0 && totalGoals % goalThreshold === 0) {
                goalMilestones.push({ name: player.name, total_goals: totalGoals });
            }
        }

        // Update the aggregated_match_report entry for the latest match
        // Ensure the entry exists before updating (it should be created by updateMatchReportCache)
        await prisma.aggregated_match_report.updateMany({
            where: { match_id: latestMatchId },
            data: {
                game_milestones: gameMilestones as any, // Prisma handles JSON conversion
                goal_milestones: goalMilestones as any,
            },
        });

        const endTime = Date.now();
        console.log(`updateMatchMilestones completed in ${endTime - startTime}ms.`);

     } catch (error) {
         console.error(`Error updating match milestones for match ID ${latestMatchId}:`, error);
         throw error;
     }
}

/**
 * Calculates changes in leadership for goals and fantasy points for the
 * current season and half-season, up to the specified match.
 * Mimics the logic of the calculate_leaders_for_match SQL function.
 *
 * @param {number} targetMatchId - The ID of the match to calculate leaders up to.
 * @param {AppConfig} config - Application configuration object.
 * @returns {Promise<MatchLeaders>} An object containing leader change information.
 */
export async function calculateMatchLeaders(targetMatchId: number, config: AppConfig): Promise<MatchLeaders> {
     console.log(`Starting calculateMatchLeaders for match ID: ${targetMatchId}...`);
     const startTime = Date.now();

     try {
        const targetMatch = await prisma.matches.findUnique({
            where: { match_id: targetMatchId },
            select: { match_date: true },
        });

        if (!targetMatch?.match_date) {
            throw new Error(`Match not found or has no date: ID ${targetMatchId}`);
        }
        const targetDate = targetMatch.match_date;
        const currentYear = targetDate.getFullYear();
        const currentMonth = targetDate.getMonth() + 1;

        // Determine date ranges
        const seasonStart = new Date(currentYear, 0, 1);
        let halfSeasonStart: Date;
        if (currentMonth <= 6) {
            halfSeasonStart = new Date(currentYear, 0, 1);
        } else {
            halfSeasonStart = new Date(currentYear, 6, 1);
        }

        // Helper to fetch and process stats for a given period
        const getStatsForPeriod = async (startDate: Date, endDate: Date): Promise<Map<number, PlayerPeriodStats>> => {
            const playerMatches = await prisma.player_matches.findMany({
                where: {
                    matches: { match_date: { gte: startDate, lte: endDate } },
                    players: { is_ringer: false, is_retired: false },
                },
                include: {
                    players: { select: { name: true } },
                    matches: { select: { team_a_score: true, team_b_score: true } } // Needed for clean sheets
                },
            });

            const statsMap = new Map<number, PlayerPeriodStats & { // Include raw counts for fantasy calc
                 wins: number; draws: number; losses: number; heavy_wins: number; heavy_losses: number;
                 clean_sheet_wins: number; clean_sheet_draws: number; heavy_clean_sheet_wins: number;
            }>();

            for (const pm of playerMatches) {
                if (!pm.player_id || !pm.players) continue;

                let playerStat = statsMap.get(pm.player_id);
                if (!playerStat) {
                    playerStat = {
                        name: pm.players.name,
                        total_goals: 0, fantasy_points: 0,
                        wins: 0, draws: 0, losses: 0, heavy_wins: 0, heavy_losses: 0,
                        clean_sheet_wins: 0, clean_sheet_draws: 0, heavy_clean_sheet_wins: 0,
                    };
                    statsMap.set(pm.player_id, playerStat);
                }

                playerStat.total_goals += pm.goals ?? 0;

                // Accumulate counts for fantasy points
                const isWin = pm.result === 'win';
                const isDraw = pm.result === 'draw';
                const isLoss = pm.result === 'loss';
                const isHeavyWin = pm.heavy_win ?? false;
                const isHeavyLoss = pm.heavy_loss ?? false;
                const isCleanSheet = pm.clean_sheet ?? false; // Assuming clean_sheet is pre-calculated

                if (isWin) playerStat.wins++;
                if (isDraw) playerStat.draws++;
                if (isLoss) playerStat.losses++;
                if (isWin && isHeavyWin) playerStat.heavy_wins++;
                if (isLoss && isHeavyLoss) playerStat.heavy_losses++;
                if (isWin && isCleanSheet) playerStat.clean_sheet_wins++;
                if (isDraw && isCleanSheet) playerStat.clean_sheet_draws++;
                if (isWin && isHeavyWin && isCleanSheet) playerStat.heavy_clean_sheet_wins++;
            }

            // Calculate fantasy points after accumulating all counts
            statsMap.forEach((stat) => {
                stat.fantasy_points = calculateFantasyPoints(stat, config);
            });

            return statsMap;
        };

        // Calculate stats for current and previous periods
        const currentSeasonStats = await getStatsForPeriod(seasonStart, targetDate);
        const previousSeasonStats = await getStatsForPeriod(seasonStart, new Date(targetDate.getTime() - 1)); // Up to day before

        const currentHalfSeasonStats = await getStatsForPeriod(halfSeasonStart, targetDate);
        const previousHalfSeasonStats = await getStatsForPeriod(halfSeasonStart, new Date(targetDate.getTime() - 1));

        // Helper to find the leader(s) from a stats map
        const findLeader = (statsMap: Map<number, PlayerPeriodStats>, metric: 'total_goals' | 'fantasy_points'): PlayerPeriodStats | null => {
             let leader: PlayerPeriodStats | null = null;
             let maxValue = -Infinity;
             for (const stat of statsMap.values()) {
                 const value = stat[metric];
                 if (value > maxValue) {
                     maxValue = value;
                     leader = stat;
                 } else if (value === maxValue) {
                     // Handle ties - SQL version just takes LIMIT 1, effectively arbitrary.
                     // We will also take the first one encountered for simplicity, matching SQL.
                     // For true tie reporting, would need to return an array.
                 }
             }
             return leader;
        };

        // Helper to determine leader change
        const getLeaderChange = (currentLeader: PlayerPeriodStats | null, previousLeader: PlayerPeriodStats | null, metric: 'total_goals' | 'fantasy_points'): LeaderInfo => {
             const change: LeaderInfo = { change_type: 'no_leader' }; // Default
             const metricKey = metric === 'total_goals' ? 'total_goals' : 'fantasy_points';
             const valueKey = metric === 'total_goals' ? 'new_leader_goals' : 'new_leader_points';
             const prevValueKey = metric === 'total_goals' ? 'previous_leader_goals' : 'previous_leader_points';

             change.new_leader = currentLeader?.name;
             change[valueKey] = currentLeader?.[metricKey];
             change.previous_leader = previousLeader?.name;
             change[prevValueKey] = previousLeader?.[metricKey];

             if (!currentLeader && !previousLeader) {
                 change.change_type = 'no_leader';
             } else if (currentLeader && !previousLeader) {
                 change.change_type = 'new_leader';
             } else if (!currentLeader && previousLeader) {
                 // Leader lost? This case isn't explicitly handled in SQL, assume 'no_leader' now
                 change.change_type = 'no_leader';
             } else if (currentLeader && previousLeader) {
                 if (currentLeader.name === previousLeader.name) {
                     change.change_type = 'remains';
                 } else if (currentLeader[metricKey] === previousLeader[metricKey]) {
                     change.change_type = 'tied'; // Note: SQL logic might differ slightly on tie definition
                 } else {
                     change.change_type = 'overtake';
                 }
             }

             return change;
        };

        // Find leaders for each period and metric
        const currentSeasonGoalLeader = findLeader(currentSeasonStats, 'total_goals');
        const previousSeasonGoalLeader = findLeader(previousSeasonStats, 'total_goals');
        const currentSeasonFantasyLeader = findLeader(currentSeasonStats, 'fantasy_points');
        const previousSeasonFantasyLeader = findLeader(previousSeasonStats, 'fantasy_points');

        const currentHalfSeasonGoalLeader = findLeader(currentHalfSeasonStats, 'total_goals');
        const previousHalfSeasonGoalLeader = findLeader(previousHalfSeasonStats, 'total_goals');
        const currentHalfSeasonFantasyLeader = findLeader(currentHalfSeasonStats, 'fantasy_points');
        const previousHalfSeasonFantasyLeader = findLeader(previousHalfSeasonStats, 'fantasy_points');

        // Determine changes
        const leaders: MatchLeaders = {
            season_goals: getLeaderChange(currentSeasonGoalLeader, previousSeasonGoalLeader, 'total_goals'),
            season_fantasy: getLeaderChange(currentSeasonFantasyLeader, previousSeasonFantasyLeader, 'fantasy_points'),
            half_season_goals: getLeaderChange(currentHalfSeasonGoalLeader, previousHalfSeasonGoalLeader, 'total_goals'),
            half_season_fantasy: getLeaderChange(currentHalfSeasonFantasyLeader, previousHalfSeasonFantasyLeader, 'fantasy_points'),
        };

        const endTime = Date.now();
        console.log(`calculateMatchLeaders completed in ${endTime - startTime}ms.`);
        return leaders;

     } catch (error) {
         console.error(`Error calculating match leaders for match ID ${targetMatchId}:`, error);
         throw error;
     }
}

// --- Fantasy Points Helper (Duplicated - Consider Centralizing) --- 
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

interface PlayerPeriodStats {
    name: string | null;
    total_goals: number;
    fantasy_points: number;
}

interface LeaderInfo {
    change_type: 'new_leader' | 'remains' | 'tied' | 'overtake' | 'no_leader';
    new_leader?: string | null;
    new_leader_value?: number;
    previous_leader?: string | null;
    previous_leader_value?: number;
}

// --- Export needed interfaces --- 
export interface MatchLeaders {
    season_goals: LeaderInfo;
    season_fantasy: LeaderInfo;
    half_season_goals: LeaderInfo;
    half_season_fantasy: LeaderInfo;
} 