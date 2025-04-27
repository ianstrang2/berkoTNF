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
  // VERY EARLY LOG
  console.log('[updateRecentPerformance] Function invoked.');
  const startTime = Date.now();

  // Use provided transaction client or fall back to global prisma client
  const client = tx || prisma;
  console.log(`[updateRecentPerformance] Using ${tx ? 'provided transaction' : 'global prisma client'}.`);

  try {
    console.log('[updateRecentPerformance] Fetching non-ringer players...');
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

    console.log(`[updateRecentPerformance] Found ${players.length} active non-ringer players to process`);

    // Use CreateManyInput type for createMany
    const recentPerformanceData: Prisma.aggregated_recent_performanceCreateManyInput[] = [];

    // Process ALL players concurrently (potential timeout risk!)
    console.log('[updateRecentPerformance] Processing ALL players concurrently (batching removed)');
    const allPlayerPromises = players.map(async (player) => {
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
        console.error(`[updateRecentPerformance] Error processing player ${playerId}:`, playerError);
        // Return null to indicate this player failed
        return null;
      }
    });
    
    // Wait for all players to be processed
    console.log('[updateRecentPerformance] Waiting for all player promises to resolve...');
    const allResults = await Promise.all(allPlayerPromises);
    console.log('[updateRecentPerformance] All player promises resolved.');
    
    // Add successful results to our data array
    let successfulResults = 0;
    for (const result of allResults) {
      if (result !== null) {
        recentPerformanceData.push(result);
        successfulResults++;
      }
    }
    console.log(`[updateRecentPerformance] Processed ${successfulResults}/${players.length} players successfully`);

    console.log(`[updateRecentPerformance] Preparing to update database with data for ${recentPerformanceData.length} players`);

    // DIAGNOSIS CHECKPOINT 1
    console.log('[updateRecentPerformance] CHECKPOINT 1: About to delete existing records and create new ones');
    
    try {
      // Clear the existing table and insert new data in a transaction
      if (tx) {
        // If we're already in a transaction, use it directly
        console.log('Using provided transaction to update data');
        await tx.aggregated_recent_performance.deleteMany({});
        
        if (recentPerformanceData.length > 0) {
          console.log(`Creating ${recentPerformanceData.length} recent performance records...`);
          await tx.aggregated_recent_performance.createMany({
            data: recentPerformanceData,
            skipDuplicates: true,
          });
          console.log('Recent performance records created successfully');
        }
      } else {
        // Otherwise use a local transaction with a timeout
        console.log('Creating new transaction to update data');
        await prisma.$transaction(async (txClient) => {
          console.log('Deleting existing recent performance records...');
          await txClient.aggregated_recent_performance.deleteMany({});
          console.log('Existing records deleted');
          
          if (recentPerformanceData.length > 0) {
            console.log(`Creating ${recentPerformanceData.length} recent performance records...`);
            await txClient.aggregated_recent_performance.createMany({
              data: recentPerformanceData,
              skipDuplicates: true,
            });
            console.log('Recent performance records created successfully');
          }
        }, {
          timeout: 60000, // 1 minute timeout
          maxWait: 10000, // 10 second max wait for connection
        });
      }
      
      // DIAGNOSIS CHECKPOINT 2
      console.log('CHECKPOINT 2: Database operations completed successfully');
    } catch (dbError) {
      console.error('CRITICAL ERROR during database operations:', dbError);
      console.error('Error type:', typeof dbError);
      console.error('Error name:', dbError instanceof Error ? dbError.name : 'Not an Error object');
      console.error('Error message:', dbError instanceof Error ? dbError.message : 'No message available');
      console.error('Error stack:', dbError instanceof Error ? dbError.stack : 'No stack available');
      throw dbError; // Rethrow to be caught by outer catch
    }

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