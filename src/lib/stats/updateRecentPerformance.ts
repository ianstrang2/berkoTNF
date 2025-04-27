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
  console.log('[updateRecentPerformance] Function invoked.');
  const startTime = Date.now();
  const client = tx || prisma;
  // Correct logging for client type detection
  console.log(`[updateRecentPerformance] Using ${tx === prisma ? 'global prisma client' : tx ? 'provided transaction' : 'global prisma client (fallback)'}.`);

  try {
    // --- Optimize Player Fetching --- 
    // Get total player count first for batch calculation
    console.log('[updateRecentPerformance] Fetching non-ringer player count...');
    const totalPlayers = await client.players.count({
      where: { is_ringer: false, is_retired: false },
    });
    console.log(`[updateRecentPerformance] Found ${totalPlayers} active non-ringer players to process.`);

    if (totalPlayers === 0) {
      console.log('[updateRecentPerformance] No players to process. Clearing table and exiting.');
      // Ensure table is cleared even if no players
      await client.aggregated_recent_performance.deleteMany({});
      return; 
    }

    const recentPerformanceData: Prisma.aggregated_recent_performanceCreateManyInput[] = [];
    const BATCH_SIZE = 10; // Keep batch size relatively small
    const totalBatches = Math.ceil(totalPlayers / BATCH_SIZE);
    
    console.log(`[updateRecentPerformance] Processing in ${totalBatches} batches of up to ${BATCH_SIZE} players`);
    
    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const skip = batchIndex * BATCH_SIZE;
      console.log(`[updateRecentPerformance] Processing batch ${batchIndex + 1}/${totalBatches} (skip: ${skip}, take: ${BATCH_SIZE})`);
      
      // Fetch player IDs FOR THIS BATCH ONLY
      console.log(`[updateRecentPerformance] Fetching player IDs for batch ${batchIndex + 1}...`);
      const playerBatch = await client.players.findMany({
          where: { is_ringer: false, is_retired: false },
          select: { player_id: true },
          orderBy: { player_id: 'asc' }, // Consistent ordering is important for skip/take
          skip: skip,
          take: BATCH_SIZE,
      });
      console.log(`[updateRecentPerformance] Fetched ${playerBatch.length} player IDs for batch ${batchIndex + 1}.`);

      if (playerBatch.length === 0) {
          console.log(`[updateRecentPerformance] Batch ${batchIndex + 1} was empty, skipping.`);
          continue; // Should not happen with count logic, but safety first
      }
      
      // Process players in this batch concurrently
      const batchPromises = playerBatch.map(async (player) => {
        const playerId = player.player_id;
        try {
          // Fetch the last 5 matches for the player
          // console.log(`Fetching last 5 matches for player ${playerId}...`); // Reduce log noise
          const last5PlayerMatches = await client.player_matches.findMany({
            where: { player_id: playerId },
            include: {
              matches: {
                select: { match_date: true, team_a_score: true, team_b_score: true }
              }
            },
            orderBy: {
              matches: {
                match_date: 'desc',
              },
            },
            take: 5,
          });

          // console.log(`Found ${last5PlayerMatches.length} recent matches for player ${playerId}`);

          let last5Goals = 0;
          const last5Games: LastGameInfo[] = [];

          // Process the last 5 matches (or fewer if player has played less than 5)
          for (const pm of last5PlayerMatches) {
            const match = pm.matches;
            if (!match) continue;
            const goals = pm.goals ?? 0;
            const result = pm.result ?? '';
            const teamAScore = match.team_a_score ?? 0;
            const teamBScore = match.team_b_score ?? 0;
            const heavyWin = pm.heavy_win ?? false;
            const heavyLoss = pm.heavy_loss ?? false;
            const isTeamA = pm.team === 'A';
            const score = isTeamA ? `${teamAScore}-${teamBScore}` : `${teamBScore}-${teamAScore}`;
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
          }

          // console.log(`Player ${playerId} has ${last5Goals} goals in their last ${last5Games.length} games`);

          return {
            player_id: playerId,
            last_5_games: last5Games as any, // Keep 'as any' for now, revisit if it causes issues
            last_5_goals: last5Goals,
            last_updated: new Date(),
          };
        } catch (playerError) {
          console.error(`[updateRecentPerformance] Error processing player ${playerId} in batch ${batchIndex + 1}:`, playerError);
          return null; // Indicate failure for this player
        }
      }); // End playerBatch.map
      
      console.log(`[updateRecentPerformance] Waiting for batch ${batchIndex + 1} promises...`);
      const batchResults = await Promise.all(batchPromises);
      console.log(`[updateRecentPerformance] Batch ${batchIndex + 1} promises resolved.`);
      
      // Add successful results from this batch
      let successfulBatchResults = 0;
      for (const result of batchResults) {
        if (result !== null) {
          recentPerformanceData.push(result);
          successfulBatchResults++;
        }
      }
      console.log(`[updateRecentPerformance] Batch ${batchIndex + 1} complete. Processed ${successfulBatchResults}/${playerBatch.length} players successfully.`);
      
    } // End for loop over batches
    // --- END Optimize Player Fetching ---

    console.log(`[updateRecentPerformance] All batches processed. Total successful players: ${recentPerformanceData.length}/${totalPlayers}.`);
    console.log(`[updateRecentPerformance] Preparing to update database...`);

    // DIAGNOSIS CHECKPOINT 1
    console.log('[updateRecentPerformance] CHECKPOINT 1: About to delete existing records and create new ones');
    
    // Use the provided transaction client (tx) passed from triggerStep
    console.log('[updateRecentPerformance] Using provided transaction to update data');
    await client.aggregated_recent_performance.deleteMany({}); // Use client (which is tx here)
    
    if (recentPerformanceData.length > 0) {
      console.log(`[updateRecentPerformance] Creating ${recentPerformanceData.length} recent performance records...`);
      await client.aggregated_recent_performance.createMany({ // Use client (which is tx here)
        data: recentPerformanceData,
        skipDuplicates: true,
      });
      console.log('[updateRecentPerformance] Recent performance records created successfully');
    } else {
        console.log('[updateRecentPerformance] No successful player data to insert, only cleared table.');
    }
      
    // DIAGNOSIS CHECKPOINT 2
    console.log('[updateRecentPerformance] CHECKPOINT 2: Database operations completed successfully');

    const endTime = Date.now();
    console.log(`FUNCTION COMPLETED SUCCESSFULLY: updateRecentPerformance completed in ${endTime - startTime}ms. Updated stats for ${recentPerformanceData.length} players.`);

  } catch (error) {
    // Log top-level errors within this function
    console.error('[updateRecentPerformance] CRITICAL FUNCTION-LEVEL ERROR:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Not an Error object');
    console.error('Error message:', error instanceof Error ? error.message : 'No message available');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    console.error('FUNCTION FAILED: updateRecentPerformance did not complete successfully');
    
    throw new Error(`Failed to update recent performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 