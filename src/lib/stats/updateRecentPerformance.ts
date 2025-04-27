import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';

// Keep interface just to avoid breaking import elsewhere potentially
interface LastGameInfo { date: Date; goals: number; result: string; score: string; heavy_win: boolean; heavy_loss: boolean; clean_sheet: boolean;}

/**
 * Updates the aggregated_recent_performance table with the last 5 games,
 * goals, and results for each non-ringer player.
 * @param tx Optional Prisma transaction client (will receive global prisma in current usage)
 */
export async function updateRecentPerformance(tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<void> {
  console.log('[updateRecentPerformance] Function invoked.');
  const startTime = Date.now();
  const client = tx || prisma; // Should receive global prisma now
  console.log(`[updateRecentPerformance] Using ${client === prisma ? 'global prisma client' : 'provided client'}.`);

  try {
    // --- Iterative Batch Fetching --- 
    const recentPerformanceData: Prisma.aggregated_recent_performanceCreateManyInput[] = [];
    const BATCH_SIZE = 10; 
    let playersProcessed = 0;
    let currentBatch = 0;
    let lastPlayerId = 0; // Use cursor-based pagination

    console.log(`[updateRecentPerformance] Starting iterative batch processing (batch size: ${BATCH_SIZE})`);

    while (true) {
      currentBatch++;
      console.log(`[updateRecentPerformance] Processing batch ${currentBatch}...`);

      console.log(`[updateRecentPerformance] Fetching player IDs for batch ${currentBatch} (cursor: ${lastPlayerId})...`);
      const playerBatch = await client.players.findMany({
          where: { is_ringer: false, is_retired: false },
          select: { player_id: true },
          orderBy: { player_id: 'asc' }, 
          cursor: lastPlayerId === 0 ? undefined : { player_id: lastPlayerId }, 
          skip: lastPlayerId === 0 ? 0 : 1, 
          take: BATCH_SIZE,
      });
      console.log(`[updateRecentPerformance] Fetched ${playerBatch.length} player IDs for batch ${currentBatch}.`);

      if (playerBatch.length === 0) {
          console.log(`[updateRecentPerformance] Batch ${currentBatch} was empty. All players processed.`);
          break; 
      }
      
      const batchPromises = playerBatch.map(async (player) => {
        const playerId = player.player_id;
        try {
          const last5PlayerMatches = await client.player_matches.findMany({
              where: { player_id: playerId },
              include: {
                matches: { select: { match_date: true, team_a_score: true, team_b_score: true } }
              },
              orderBy: { matches: { match_date: 'desc' } },
              take: 5,
          });
          let last5Goals = 0;
          const last5Games: LastGameInfo[] = [];
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
          return {
              player_id: playerId,
              last_5_games: last5Games as any,
              last_5_goals: last5Goals,
              last_updated: new Date(),
          };
        } catch (playerError) {
          console.error(`[updateRecentPerformance] Error processing player ${playerId} in batch ${currentBatch}:`, playerError);
          return null; 
        }
      }); 
      
      console.log(`[updateRecentPerformance] Waiting for batch ${currentBatch} promises...`);
      const batchResults = await Promise.all(batchPromises);
      console.log(`[updateRecentPerformance] Batch ${currentBatch} promises resolved.`);
      
      let successfulBatchResults = 0;
      for (const result of batchResults) {
        if (result !== null) {
          recentPerformanceData.push(result);
          successfulBatchResults++;
        }
      }
      playersProcessed += successfulBatchResults;
      console.log(`[updateRecentPerformance] Batch ${currentBatch} complete. Processed ${successfulBatchResults}/${playerBatch.length} players successfully.`);

      lastPlayerId = playerBatch[playerBatch.length - 1].player_id;
    } 

    console.log(`[updateRecentPerformance] All batches processed. Total successful players: ${playersProcessed}.`);
    console.log(`[updateRecentPerformance] Preparing to update database...`);

    console.log('[updateRecentPerformance] CHECKPOINT 1: About to delete existing records and create new ones');
    
    // Perform writes using the provided client (which should be global prisma now)
    console.log('[updateRecentPerformance] Performing DB writes (deleteMany/createMany)...');
    await client.aggregated_recent_performance.deleteMany({}); 
    
    if (recentPerformanceData.length > 0) {
      console.log(`[updateRecentPerformance] Creating ${recentPerformanceData.length} recent performance records...`);
      await client.aggregated_recent_performance.createMany({ 
        data: recentPerformanceData,
        skipDuplicates: true,
      });
      console.log('[updateRecentPerformance] Recent performance records created successfully');
    } else {
        console.log('[updateRecentPerformance] No successful player data to insert, only cleared table.');
    }
      
    console.log('[updateRecentPerformance] CHECKPOINT 2: Database operations completed successfully');

    const endTime = Date.now();
    console.log(`FUNCTION COMPLETED SUCCESSFULLY: updateRecentPerformance completed in ${endTime - startTime}ms.`);

  } catch (error) {
     console.error('[updateRecentPerformance] CRITICAL FUNCTION-LEVEL ERROR:', error);
     console.error('FUNCTION FAILED: updateRecentPerformance did not complete successfully');
     throw new Error(`Failed to update recent performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 