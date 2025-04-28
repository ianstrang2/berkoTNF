import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Import the Prisma Edge Client and types
// Make sure you ran `npx prisma generate --data-proxy`
import { PrismaClient } from './generated/index.js';
import { withAccelerate } from './extension-accelerate.ts';


console.log('Initializing Supabase Edge Function: update-recent-performance');

// Define interface (copied from original, ensure consistency)
interface LastGameInfo {
  date: Date;
  goals: number;
  result: string;
  score: string;
  heavy_win: boolean;
  heavy_loss: boolean;
  clean_sheet: boolean;
}

// --- Core Logic (Adapted updateRecentPerformance) ---
// Moved inside to be called by the handler
async function performUpdate(client: PrismaClient): Promise<{ success: boolean; message: string; processedCount?: number; error?: string }> {
  console.log('[performUpdate] Task invoked.');
  const startTime = Date.now();

  try {
    const recentPerformanceData: Prisma.aggregated_recent_performanceCreateManyInput[] = [];
    const BATCH_SIZE = 50; // Increased batch size for Edge Function
    let playersProcessed = 0;
    let successfulPlayers = 0;
    let currentBatchNum = 0;
    let lastPlayerId = 0;

    console.log(`[performUpdate] Starting iterative batch processing (batch size: ${BATCH_SIZE})`);

    while (true) {
      currentBatchNum++;
      console.log(`[performUpdate] Processing batch ${currentBatchNum}...`);

      console.log(`[performUpdate] Fetching player IDs for batch ${currentBatchNum} (cursor: ${lastPlayerId})...`);
      const playerBatch = await client.players.findMany({
          where: { is_ringer: false, is_retired: false },
          select: { player_id: true },
          orderBy: { player_id: 'asc' },
          cursor: lastPlayerId === 0 ? undefined : { player_id: lastPlayerId },
          skip: lastPlayerId === 0 ? 0 : 1,
          take: BATCH_SIZE,
      });
      console.log(`[performUpdate] Fetched ${playerBatch.length} player IDs for batch ${currentBatchNum}.`);

      if (playerBatch.length === 0) {
          console.log(`[performUpdate] Batch ${currentBatchNum} was empty. All players processed.`);
          break; // Exit loop
      }

      // Sequential processing within batch
      console.log(`[performUpdate] Processing ${playerBatch.length} players sequentially for batch ${currentBatchNum}...`);
      let successfulBatchResults = 0;
      for (const player of playerBatch) {
        const playerId = player.player_id;
        // Optional: Add more granular logging if needed during long runs
        // console.log(`[performUpdate] Processing player ${playerId} (Batch ${currentBatchNum})...`);
        try {
          // Fetch matches for this SINGLE player
          const last5PlayerMatches = await client.player_matches.findMany({
              where: { player_id: playerId },
              include: { matches: { select: { match_date: true, team_a_score: true, team_b_score: true } } },
              orderBy: { matches: { match_date: 'desc' } },
              take: 5,
          });

          // Process matches in memory
          let last5Goals = 0;
          const last5Games: LastGameInfo[] = [];
          for (const pm of last5PlayerMatches) {
              const match = pm.matches;
              if (!match) continue;
              // Safely access potentially null fields
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
                  date: new Date(match.match_date), // Ensure Date object
                  goals: goals, result: result, score: score,
                  heavy_win: heavyWin, heavy_loss: heavyLoss, clean_sheet: cleanSheet,
              });
              last5Goals += goals;
          }

          // Add result to main array
          recentPerformanceData.push({
              player_id: playerId,
              last_5_games: last5Games as any, // Keep as any for now, consider stricter typing later
              last_5_goals: last5Goals,
              last_updated: new Date(),
          });
          successfulBatchResults++;
        } catch (playerError) {
          console.error(`[performUpdate] Error processing player ${playerId} in batch ${currentBatchNum}:`, playerError?.message || playerError);
          // Continue to next player
        }
      } // End sequential player loop

      playersProcessed += playerBatch.length;
      successfulPlayers += successfulBatchResults;
      console.log(`[performUpdate] Batch ${currentBatchNum} complete. Successfully processed ${successfulBatchResults}/${playerBatch.length} players.`);

      lastPlayerId = playerBatch[playerBatch.length - 1].player_id;
    } // End while loop (batches)

    console.log(`[performUpdate] All batches processed. Total successful players: ${successfulPlayers}/${playersProcessed}.`);
    console.log(`[performUpdate] Preparing DB write using non-interactive transaction...`);

    // Non-Interactive Transaction for Writes
    const deleteOp = client.aggregated_recent_performance.deleteMany({});
    const transactionOps = [deleteOp];
    if (recentPerformanceData.length > 0) {
      const createOp = client.aggregated_recent_performance.createMany({
        data: recentPerformanceData,
        skipDuplicates: true,
      });
      transactionOps.push(createOp);
      console.log(`[performUpdate] Delete & Create Ops defined for ${recentPerformanceData.length} records.`);
    } else {
       console.log(`[performUpdate] Delete Op defined. No records to create.`);
    }

    const transactionResult = await client.$transaction(transactionOps);
    console.log('[performUpdate] Non-interactive transaction completed successfully.');
    console.log(`[performUpdate] Transaction results: Delete count=${transactionResult[0].count}` + (transactionResult[1] ? `, Create count=${transactionResult[1].count}` : ''));

    const endTime = Date.now();
    const message = `Update successful (${successfulPlayers}/${playersProcessed} players processed) in ${endTime - startTime}ms.`;
    console.log(`[performUpdate] ${message}`);
    return { success: true, message: message, processedCount: successfulPlayers };

  } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('[performUpdate] CRITICAL FUNCTION-LEVEL ERROR:', error);
     return { success: false, message: `Failed to update recent performance: ${errorMessage}`, error: errorMessage };
  }
}

// --- Edge Function Handler ---
serve(async (req: Request) => {
  console.log(`[Edge Function] Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[Edge Function] Handling OPTIONS request (CORS preflight)');
    return new Response('ok', { headers: {
        'Access-Control-Allow-Origin': '*', // Or specific origin
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  console.log('[Edge Function] Initializing Prisma Client with Accelerate...');
  const prisma = new PrismaClient().$extends(withAccelerate());
  console.log('[Edge Function] Prisma Client initialized.');

  // Execute the main update logic
  let updateResult: { success: boolean; message: string; processedCount?: number; error?: string };
  try {
    console.log('[Edge Function] Calling performUpdate...');
    // Pass the initialized client to the core logic function
    updateResult = await performUpdate(prisma);
    console.log(`[Edge Function] performUpdate finished. Success: ${updateResult.success}`);
  } catch (handlerError) {
      console.error('[Edge Function] UNHANDLED ERROR during performUpdate execution:', handlerError);
      updateResult = { success: false, message: `Unexpected handler error: ${handlerError.message}`, error: handlerError.message };
  } finally {
      // Disconnect Prisma client
      if (prisma) {
          console.log('[Edge Function] Attempting explicit prisma.$disconnect()...');
          await prisma.$disconnect().catch(disconnectError => {
              console.error('[Edge Function] Error during prisma.$disconnect():', disconnectError);
          });
          console.log('[Edge Function] prisma.$disconnect() attempted.');
      }
  }

  // Return the result
  return new Response(
    JSON.stringify(updateResult),
    {
      status: updateResult.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // Add CORS header
    }
  );
});

console.log('Edge Function update-recent-performance listener started.');
