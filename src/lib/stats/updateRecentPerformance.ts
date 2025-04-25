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
    console.log('Fetching non-ringer players...');
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

    console.log(`Found ${players.length} active non-ringer players to process`);

    // Use CreateManyInput type for createMany
    const recentPerformanceData: Prisma.aggregated_recent_performanceCreateManyInput[] = [];

    // Process players in batches to avoid timeouts in serverless environments
    const BATCH_SIZE = 10;
    const playerBatches: Array<typeof players[number][]> = [];
    
    // Split players into batches
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      playerBatches.push(players.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${playerBatches.length} batches of players`);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < playerBatches.length; batchIndex++) {
      const playerBatch = playerBatches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${playerBatches.length} (${playerBatch.length} players)`);
      
      // Process players in this batch concurrently
      const batchPromises = playerBatch.map(async (player) => {
        const playerId = player.player_id;

        try {
          // Fetch the last 5 matches for the player
          console.log(`Fetching last 5 matches for player ${playerId}...`);
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

          console.log(`Found ${last5PlayerMatches.length} recent matches for player ${playerId}`);

          let last5Goals = 0;
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
          }

          console.log(`Player ${playerId} has ${last5Goals} goals in their last ${last5Games.length} games`);

          return {
            player_id: playerId,
            last_5_games: last5Games as any,
            last_5_goals: last5Goals,
            last_updated: new Date(),
          };
        } catch (playerError) {
          console.error(`Error processing player ${playerId}:`, playerError);
          // Return null to indicate this player failed
          return null;
        }
      });
      
      // Wait for all players in this batch to be processed
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results to our data array
      let successfulResults = 0;
      for (const result of batchResults) {
        if (result !== null) {
          recentPerformanceData.push(result);
          successfulResults++;
        }
      }
      
      console.log(`Batch ${batchIndex + 1} complete, processed ${successfulResults}/${batchResults.length} players successfully`);
    }

    console.log(`Preparing to update database with data for ${recentPerformanceData.length} players`);

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

    const endTime = Date.now();
    console.log(`updateRecentPerformance completed in ${endTime - startTime}ms. Updated stats for ${recentPerformanceData.length} players.`);

  } catch (error) {
    console.error('Error updating recent performance:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Not an Error object');
    console.error('Error message:', error instanceof Error ? error.message : 'No message available');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    throw new Error(`Failed to update recent performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 