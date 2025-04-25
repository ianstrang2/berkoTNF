import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';

// Define the structure for the last_5_games JSON blob
interface LastGameInfo {
  date: Date;
  goals: number;
  result: string;
  score: string;
  heavy_win: boolean; // Adjusted from boolean | null
  heavy_loss: boolean; // Adjusted from boolean | null
  clean_sheet: boolean;
}

/**
 * Updates the aggregated_recent_performance table with the last 5 games,
 * goals, and results for each non-ringer player.
 * @param tx Optional Prisma transaction client
 */
export async function updateRecentPerformance(tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<void> {
  console.log('Starting updateRecentPerformance...');
  const startTime = Date.now();

  // Use provided transaction client or fall back to global prisma client
  const client = tx || prisma;

  try {
    // Get all non-ringer player IDs
    const players = await client.players.findMany({
      where: {
        is_ringer: false,
        is_retired: false, // Assuming we only track active players
      },
      select: {
        player_id: true,
      },
    });

    // Use CreateManyInput type for createMany
    const recentPerformanceData: Prisma.aggregated_recent_performanceCreateManyInput[] = [];

    for (const player of players) {
      const playerId = player.player_id;

      // Fetch the last 5 matches for the player
      const last5PlayerMatches = await client.player_matches.findMany({
        where: { player_id: playerId },
        include: {
          matches: true, // Include match details for date and scores
        },
        orderBy: {
          matches: {
            match_date: 'desc',
          },
        },
        take: 5,
      });

      let last5Goals = 0;
      // const last5Results: string[] = []; // Removed as per original SQL and likely schema
      const last5Games: LastGameInfo[] = [];

      // Process the last 5 matches (or fewer if player has played less than 5)
      for (const pm of last5PlayerMatches) {
        const match = pm.matches;
        if (!match) continue; // Should not happen with the include, but safety check

        // Handle potential nulls from DB schema using nullish coalescing
        const goals = pm.goals ?? 0;
        const result = pm.result ?? ''; // Use empty string or 'unknown' if null
        const teamAScore = match.team_a_score ?? 0;
        const teamBScore = match.team_b_score ?? 0;
        const heavyWin = pm.heavy_win ?? false;
        const heavyLoss = pm.heavy_loss ?? false;

        if (!result) {
             console.warn(`Player match ID ${pm.player_match_id} has null result.`);
             // Decide how to handle this - skip? use default?
        }


        const isTeamA = pm.team === 'A';
        const score = isTeamA
          ? `${teamAScore}-${teamBScore}`
          : `${teamBScore}-${teamAScore}`;
        const cleanSheet = isTeamA ? teamBScore === 0 : teamAScore === 0;

        last5Games.push({
          date: match.match_date,
          goals: goals,
          result: result,
          score: score,
          heavy_win: heavyWin,
          heavy_loss: heavyLoss,
          clean_sheet: cleanSheet,
        });

        last5Goals += goals;
        // last5Results.push(result.charAt(0).toUpperCase()); // Removed as per original SQL and likely schema
      }

      // Ensure last_5_games is stored as a JSON blob
      // Prisma handles JSON serialization automatically if the field type is Json

      // Use direct player_id for CreateManyInput
      recentPerformanceData.push({
        player_id: playerId,
        last_5_games: last5Games as any, // Cast to 'any' or Prisma.JsonValue if Prisma complains
        last_5_goals: last5Goals,
        // last_5_results: last5Results.join(''), // Removed
        last_updated: new Date(),
      });
    }

    // Clear the existing table and insert new data in a transaction
    if (tx) {
      // If we're already in a transaction, use it directly
      await tx.aggregated_recent_performance.deleteMany({});
      await tx.aggregated_recent_performance.createMany({
        data: recentPerformanceData,
        skipDuplicates: true, // Optional: useful if run multiple times without clearing
      });
    } else {
      // Otherwise use a local transaction
      await prisma.$transaction([
        prisma.aggregated_recent_performance.deleteMany({}),
        prisma.aggregated_recent_performance.createMany({
          data: recentPerformanceData,
          skipDuplicates: true, // Optional: useful if run multiple times without clearing
        }),
      ]);
    }

    const endTime = Date.now();
    console.log(`updateRecentPerformance completed in ${endTime - startTime}ms. Updated stats for ${players.length} players.`);

  } catch (error) {
    console.error('Error updating recent performance:', error);
    // Consider more robust error handling/logging
    throw error; // Re-throw error to be caught by the calling orchestrator
  }
} 