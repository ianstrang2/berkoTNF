import { PrismaClient, Prisma } from '@prisma/client';
import { AppConfig } from '../config';
// Import shared helpers and types
import {
    calculateFantasyPointsForMatch,
    getTopRanked,
    AllTimePlayerStats, // Still needed for internal aggregation structure
    RankedEntry
} from './helpers';

const prisma = new PrismaClient();

// Removed calculateFantasyPointsForMatch (moved to helpers)

// Removed AllTimePlayerStats interface (imported from helpers, though definition used internally)

// Interface specific to this file's Hall of Fame structure
interface HallOfFameEntry {
    category: 'most_goals' | 'best_win_percentage' | 'most_fantasy_points';
    player_id: number;
    value: Prisma.Decimal; // Final value stored as Decimal
    rank: number;
}

// Removed MIN_GAMES_FOR_WIN_PERCENTAGE_HOF (will use config via getTopRanked)
// Removed HALL_OF_FAME_LIMIT (will use config via getTopRanked)

/**
 * Clears and recalculates all-time player statistics and Hall of Fame entries.
 * @param {Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">} tx - Optional Prisma transaction client
 * @param {AppConfig} config - The application configuration object.
 */
export async function updateAllTimeStats(
    tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
    config?: AppConfig
): Promise<void> {
    console.log('Starting updateAllTimeStats...');
    const startTime = Date.now();

    // Use provided transaction client or fall back to global prisma client
    const client = tx || prisma;

    // Ensure we have a config object
    if (!config) {
        throw new Error('Config object is required for updateAllTimeStats');
    }

    try {
        // Fetch all match data for non-ringer players
        const allPlayerMatches = await client.player_matches.findMany({
            where: {
                players: {
                    is_ringer: false,
                    is_retired: false, // Assuming we only include active players
                },
            },
            select: {
                player_id: true,
                result: true,
                goals: true,
                heavy_win: true,
                heavy_loss: true,
                clean_sheet: true, // Relying on this being correctly set
                team: true,
            },
        });

        // Aggregate stats in memory
        // Use Omit on the imported AllTimePlayerStats type
        const statsMap = new Map<number, Omit<AllTimePlayerStats, 'win_percentage' | 'minutes_per_goal' | 'heavy_win_percentage' | 'heavy_loss_percentage' | 'clean_sheet_percentage' | 'points_per_game' | 'player_id'> & { player_id: number }>();

        for (const pm of allPlayerMatches) {
            if (!pm.player_id) continue;

            let playerStat = statsMap.get(pm.player_id);
            if (!playerStat) {
                playerStat = {
                    player_id: pm.player_id,
                    games_played: 0, wins: 0, draws: 0, losses: 0, goals: 0,
                    heavy_wins: 0, heavy_losses: 0, clean_sheets: 0, fantasy_points: 0
                };
                statsMap.set(pm.player_id, playerStat);
            }

            playerStat.games_played++;
            playerStat.goals += pm.goals ?? 0;

            const isWin = pm.result === 'win';
            const isDraw = pm.result === 'draw';
            const isLoss = pm.result === 'loss';
            const isHeavyWin = pm.heavy_win ?? false;
            const isHeavyLoss = pm.heavy_loss ?? false;
            const isCleanSheet = pm.clean_sheet ?? false;

            if (isWin) playerStat.wins++;
            if (isDraw) playerStat.draws++;
            if (isLoss) playerStat.losses++;
            if (isHeavyWin) playerStat.heavy_wins++;
            if (isHeavyLoss) playerStat.heavy_losses++;
            if (isCleanSheet) playerStat.clean_sheets++;

            // Use helper function
            playerStat.fantasy_points += calculateFantasyPointsForMatch(pm, config);
        }

        const finalStats: AllTimePlayerStats[] = [];
        statsMap.forEach((stat) => {
            const gp = stat.games_played;
            const goals = stat.goals;
            const fantasy = stat.fantasy_points;

            // Step 2: Use config.match_duration_minutes instead of 60
            let matchDurationMinutes = 60; // Default
            if (typeof config.match_duration_minutes === 'number' && config.match_duration_minutes > 0) {
                matchDurationMinutes = config.match_duration_minutes;
            } else if (config.match_duration_minutes !== undefined) {
                console.warn(`Invalid config.match_duration_minutes (${config.match_duration_minutes}), using default ${matchDurationMinutes}.`);
            } else {
                console.warn(`Missing config.match_duration_minutes, using default ${matchDurationMinutes}.`);
            }

            const winPercentage = gp > 0 ? (stat.wins / gp) * 100 : 0;
            const minutesPerGoal = goals > 0 ? (gp * matchDurationMinutes) / goals : null; // Use variable
            const heavyWinPercentage = gp > 0 ? (stat.heavy_wins / gp) * 100 : 0;
            const heavyLossPercentage = gp > 0 ? (stat.heavy_losses / gp) * 100 : 0;
            const cleanSheetPercentage = gp > 0 ? (stat.clean_sheets / gp) * 100 : 0;
            const pointsPerGame = gp > 0 ? fantasy / gp : 0;

            finalStats.push({
                ...stat,
                win_percentage: new Prisma.Decimal(winPercentage.toFixed(1)),
                minutes_per_goal: minutesPerGoal !== null ? new Prisma.Decimal(minutesPerGoal.toFixed(1)) : null,
                heavy_win_percentage: new Prisma.Decimal(heavyWinPercentage.toFixed(1)),
                heavy_loss_percentage: new Prisma.Decimal(heavyLossPercentage.toFixed(1)),
                clean_sheet_percentage: new Prisma.Decimal(cleanSheetPercentage.toFixed(1)),
                points_per_game: new Prisma.Decimal(pointsPerGame.toFixed(1)),
            });
        });

        // --- Hall of Fame Calculation --- 
        const hallOfFameEntries: HallOfFameEntry[] = [];

        // Removed getTopRanked helper function (imported from helpers)

        // Helper to convert RankedEntry to HallOfFameEntry with correct Decimal type
        const mapRankedToHofEntry = (entry: RankedEntry, category: HallOfFameEntry['category']): HallOfFameEntry => {
            return {
                category: category,
                player_id: entry.player_id,
                // Ensure value is Prisma.Decimal for the final DB structure
                value: entry.value instanceof Prisma.Decimal ? entry.value : new Prisma.Decimal(entry.value.toString()),
                rank: entry.rank, // Keep rank for sorting, this won't be sent to DB
            };
        };

        // Most Goals
        // Pass config to getTopRanked
        const topGoals = getTopRanked(finalStats, 'goals', config);
        topGoals.forEach(entry => {
            hallOfFameEntries.push(mapRankedToHofEntry(entry, 'most_goals'));
        });

        // Best Win Percentage
        // Pass config to getTopRanked (min games handled inside)
        const topWinPerc = getTopRanked(finalStats, 'win_percentage', config);
        topWinPerc.forEach(entry => {
            hallOfFameEntries.push(mapRankedToHofEntry(entry, 'best_win_percentage'));
        });

        // Most Fantasy Points
        // Pass config to getTopRanked
        const topFantasy = getTopRanked(finalStats, 'fantasy_points', config);
        topFantasy.forEach(entry => {
            hallOfFameEntries.push(mapRankedToHofEntry(entry, 'most_fantasy_points'));
        });

        // --- Database Operations --- 
        // (Ensure Prisma schema field names match AllTimePlayerStats keys)
        const allTimeStatsData = finalStats.map(stat => ({
            player_id: stat.player_id,
            games_played: stat.games_played,
            wins: stat.wins,
            draws: stat.draws,
            losses: stat.losses,
            goals: stat.goals,
            win_percentage: stat.win_percentage,
            minutes_per_goal: stat.minutes_per_goal,
            heavy_wins: stat.heavy_wins,
            heavy_win_percentage: stat.heavy_win_percentage,
            heavy_losses: stat.heavy_losses,
            heavy_loss_percentage: stat.heavy_loss_percentage,
            clean_sheets: stat.clean_sheets,
            clean_sheet_percentage: stat.clean_sheet_percentage,
            fantasy_points: stat.fantasy_points,
            points_per_game: stat.points_per_game,
        }));

        // (Ensure Prisma schema field names match HallOfFameEntry keys)
        const hallOfFameData = hallOfFameEntries.map(entry => ({
            category: entry.category,
            player_id: entry.player_id,
            value: entry.value, // Already Prisma.Decimal from mapRankedToHofEntry
        }));

        console.log(`Calculated stats for ${finalStats.length} players.`);
        console.log(`Calculated ${hallOfFameEntries.length} Hall of Fame entries.`);

        // Use the provided transaction or create a new one
        if (tx) {
            // Clear existing data
            await tx.aggregated_all_time_stats.deleteMany({});
            await tx.aggregated_hall_of_fame.deleteMany({});
            
            // Insert new data
            if (allTimeStatsData.length > 0) {
                await tx.aggregated_all_time_stats.createMany({ data: allTimeStatsData });
            }
            
            if (hallOfFameData.length > 0) {
                await tx.aggregated_hall_of_fame.createMany({ data: hallOfFameData });
            }
        } else {
            // Use interactive transaction to ensure atomicity and allow timeout
            await prisma.$transaction(async (tx) => {
                // Clear existing data
                await tx.aggregated_all_time_stats.deleteMany({});
                await tx.aggregated_hall_of_fame.deleteMany({});
                
                // Insert new data if available
                if (allTimeStatsData.length > 0) {
                    await tx.aggregated_all_time_stats.createMany({ 
                        data: allTimeStatsData 
                    });
                }
                
                if (hallOfFameData.length > 0) {
                    await tx.aggregated_hall_of_fame.createMany({ 
                        data: hallOfFameData 
                    });
                }
            }, {
                timeout: 60000 // 60 second timeout for this transaction
            });
        }

        const endTime = Date.now();
        console.log(`updateAllTimeStats completed in ${endTime - startTime}ms.`);
    } catch (error) {
        console.error('Error updating all-time stats:', error);
        throw error; // Re-throw to caller
    }
} 