import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Initializing Supabase Edge Function: update-recent-performance');

// Define interface
interface LastGameInfo {
  date: Date;
  goals: number;
  result: string;
  score: string;
  heavy_win: boolean;
  heavy_loss: boolean;
  clean_sheet: boolean;
}

// Core logic
async function performUpdate(supabaseClient): Promise<{ success: boolean; message: string; processedCount?: number; error?: string }> {
  console.log('[performUpdate] Task invoked.');
  const startTime = Date.now();

  try {
    const recentPerformanceData = [];
    const BATCH_SIZE = 50;
    let playersProcessed = 0;
    let successfulPlayers = 0;
    let currentBatchNum = 0;
    let lastPlayerId = 0;

    console.log(`[performUpdate] Starting batch processing (size: ${BATCH_SIZE})`);

    while (true) {
      currentBatchNum++;
      console.log(`[performUpdate] Processing batch ${currentBatchNum}...`);

      // Get players
      const { data: playerBatch, error: playerError } = await supabaseClient
        .from('players')
        .select('player_id')
        .eq('is_ringer', false)
        .eq('is_retired', false)
        .order('player_id', { ascending: true })
        .gt('player_id', lastPlayerId)
        .limit(BATCH_SIZE);

      if (playerError) throw playerError;
      
      if (!playerBatch || playerBatch.length === 0) {
        console.log(`[performUpdate] Batch ${currentBatchNum} was empty. All players processed.`);
        break;
      }

      let successfulBatchResults = 0;
      for (const player of playerBatch) {
        const playerId = player.player_id;
        try {
          // Get matches
          const { data: last5PlayerMatches, error: matchesError } = await supabaseClient
            .from('player_matches')
            .select(`
              *,
              matches:match_id (
                match_date,
                team_a_score,
                team_b_score
              )
            `)
            .eq('player_id', playerId)
            .order('matches.match_date', { ascending: false })
            .limit(5);

          if (matchesError) throw matchesError;

          let last5Goals = 0;
          const last5Games = [];
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
              date: new Date(match.match_date),
              goals: goals, 
              result: result, 
              score: score,
              heavy_win: heavyWin, 
              heavy_loss: heavyLoss, 
              clean_sheet: cleanSheet,
            });
            last5Goals += goals;
          }

          recentPerformanceData.push({
            player_id: playerId,
            last_5_games: last5Games,
            last_5_goals: last5Goals,
            last_updated: new Date(),
          });
          successfulBatchResults++;
        } catch (playerError) {
          console.error(`[performUpdate] Error processing player ${playerId}:`, playerError?.message || playerError);
        }
      }

      playersProcessed += playerBatch.length;
      successfulPlayers += successfulBatchResults;
      
      lastPlayerId = playerBatch[playerBatch.length - 1].player_id;
    }

    console.log(`[performUpdate] All batches processed. Total: ${successfulPlayers}/${playersProcessed}`);

    // Delete existing records
    const { error: deleteError } = await supabaseClient
      .from('aggregated_recent_performance')
      .delete()
      .neq('player_id', 0); // Delete all records
    
    if (deleteError) throw deleteError;

    // Insert new records
    if (recentPerformanceData.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('aggregated_recent_performance')
        .insert(recentPerformanceData);
      
      if (insertError) throw insertError;
    }
    
    const endTime = Date.now();
    const message = `Update successful (${successfulPlayers}/${playersProcessed} players) in ${endTime - startTime}ms.`;
    console.log(`[performUpdate] ${message}`);
    
    return { 
      success: true, 
      message: message, 
      processedCount: successfulPlayers 
    };

  } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('[performUpdate] ERROR:', error);
     return { 
       success: false, 
       message: `Failed to update: ${errorMessage}`, 
       error: errorMessage 
     };
  }
}

// Edge Function handler
serve(async (req: Request) => {
  console.log(`[Edge Function] Request received: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  console.log('[Edge Function] Initializing Supabase Client...');
  
const supabaseClient = createClient(
  Deno.env.get('MY_SUPABASE_URL') || '',
  Deno.env.get('MY_SUPABASE_KEY') || ''
);

  console.log('[Edge Function] Supabase Client initialized.');

  let updateResult;
  try {
    updateResult = await performUpdate(supabaseClient);
  } catch (handlerError) {
    console.error('[Edge Function] ERROR:', handlerError);
    updateResult = { 
      success: false, 
      message: `Error: ${handlerError.message}`, 
      error: handlerError.message 
    };
  }

  return new Response(
    JSON.stringify(updateResult),
    {
      status: updateResult.success ? 200 : 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
    }
  );
});

console.log('Edge Function listener started.');