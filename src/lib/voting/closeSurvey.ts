/**
 * Shared Survey Close Logic
 * 
 * Used by:
 * - /api/voting/close-expired (cron job)
 * - /api/voting/active (lazy close)
 * 
 * Process:
 * 1. Tally votes per category
 * 2. Determine winners (handle ties → co-winners)
 * 3. Insert player_awards records
 * 4. Update survey with is_open=false, results JSON, closed_at
 * 5. Post system message to chat
 * 6. Log to background_job_status for visibility
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { postSystemMessage } from '@/lib/chat/systemMessage';

export interface SurveyToClose {
  id: string;
  tenant_id: string;
  match_id: number;
  upcoming_match_id?: number;  // Stable identifier for fixture
  enabled_categories: string[];
  eligible_player_ids: number[];
}

export interface CloseSurveyResult {
  success: boolean;
  surveyId: string;
  matchId: number;
  awardsCreated: number;
  results: Record<string, number[]>;
  systemMessagePosted: boolean;
  errors: string[];
}

/**
 * Close a survey and tally votes
 * 
 * @param supabase - Supabase client with service role
 * @param survey - Survey data to close
 * @param closedAt - ISO timestamp for when survey was closed
 * @param options - Optional settings (e.g., trigger source for logging)
 */
export async function closeSurvey(
  supabase: SupabaseClient,
  survey: SurveyToClose,
  closedAt: string,
  options?: { trigger?: string }
): Promise<CloseSurveyResult> {
  const { id: surveyId, tenant_id: tenantId, match_id: matchId, upcoming_match_id: upcomingMatchId, enabled_categories: categories } = survey;
  const trigger = options?.trigger || 'cron';
  const errors: string[] = [];
  
  console.log(`[VOTING] Closing survey ${surveyId} for match ${matchId} (trigger: ${trigger})`);
  
  // Get all votes for this survey
  const { data: votes, error: votesError } = await supabase
    .from('match_votes')
    .select('award_type, voted_for_player_id')
    .eq('survey_id', surveyId);
  
  if (votesError) {
    throw new Error(`Failed to fetch votes: ${votesError.message}`);
  }
  
  // Tally votes by category
  const results: Record<string, number[]> = {};
  const voteCounts: Record<string, Record<number, number>> = {};
  
  for (const category of categories) {
    voteCounts[category] = {};
  }
  
  // Count votes
  for (const vote of (votes || [])) {
    const { award_type, voted_for_player_id } = vote;
    if (!voteCounts[award_type]) continue;
    
    voteCounts[award_type][voted_for_player_id] = 
      (voteCounts[award_type][voted_for_player_id] || 0) + 1;
  }
  
  // Determine winners for each category
  const awardsToInsert: Array<{
    tenant_id: string;
    player_id: number;
    match_id: number;
    upcoming_match_id?: number;
    survey_id: string;
    award_type: string;
    vote_count: number;
    is_co_winner: boolean;
  }> = [];
  
  let hasAnyWinners = false;
  
  for (const category of categories) {
    const categoryVotes = voteCounts[category];
    const playerIds = Object.keys(categoryVotes).map(Number);
    
    if (playerIds.length === 0) {
      // No votes in this category - no winner
      results[category] = [];
      continue;
    }
    
    // Find max vote count
    const maxVotes = Math.max(...Object.values(categoryVotes));
    
    // Find all players with max votes (could be ties)
    const winners = playerIds.filter(id => categoryVotes[id] === maxVotes);
    const isCoWinner = winners.length > 1;
    
    results[category] = winners;
    
    // Create award records
    for (const playerId of winners) {
      awardsToInsert.push({
        tenant_id: tenantId,
        player_id: playerId,
        match_id: matchId,
        upcoming_match_id: upcomingMatchId,  // Stable identifier for fixture
        survey_id: surveyId,
        award_type: category,
        vote_count: categoryVotes[playerId],
        is_co_winner: isCoWinner
      });
      hasAnyWinners = true;
    }
  }
  
  // Insert awards (if any)
  let awardsCreated = 0;
  if (awardsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('player_awards')
      .insert(awardsToInsert);
    
    if (insertError) {
      console.error('Failed to insert awards:', insertError);
      errors.push(`Failed to insert awards: ${insertError.message}`);
    } else {
      awardsCreated = awardsToInsert.length;
      console.log(`[VOTING] Inserted ${awardsCreated} award(s) for survey ${surveyId}`);
    }
  }
  
  // Update survey as closed
  const { error: updateError } = await supabase
    .from('match_surveys')
    .update({
      is_open: false,
      closed_at: closedAt,
      results // Store results JSON
    })
    .eq('id', surveyId);
  
  if (updateError) {
    throw new Error(`Failed to update survey: ${updateError.message}`);
  }
  
  // Post system message
  const systemMessage = hasAnyWinners
    ? '🏆 Voting closed — check the match report for awards!'
    : '🗳️ Voting closed — no awards this week';
  
  let systemMessagePosted = false;
  try {
    await postSystemMessage({ tenantId, content: systemMessage });
    systemMessagePosted = true;
    console.log(`[VOTING] Posted system message for survey ${surveyId}`);
  } catch (msgError: any) {
    console.error('Failed to post system message:', msgError);
    errors.push(`Failed to post system message: ${msgError.message}`);
  }
  
  // Log to background_job_status for visibility in superadmin panel
  try {
    await supabase.from('background_job_status').insert({
      tenant_id: tenantId,
      job_type: 'voting_close',
      job_payload: {
        triggeredBy: trigger,
        matchId,
        surveyId,
        requestId: surveyId // Use survey ID as request ID for traceability
      },
      status: errors.length === 0 ? 'completed' : 'failed',
      started_at: closedAt,
      completed_at: new Date().toISOString(),
      retry_count: 0,
      results: {
        votes_tallied: votes?.length || 0,
        awards_created: awardsCreated,
        categories_processed: Object.keys(results).length,
        system_message_posted: systemMessagePosted,
        results_summary: results,
        errors
      }
    });
    console.log(`[VOTING] Logged job status for survey ${surveyId}`);
  } catch (logError) {
    console.error('Failed to log job status:', logError);
    // Don't fail the overall operation for logging issues
  }
  
  console.log(`[VOTING] Successfully closed survey ${surveyId}`);
  
  return {
    success: true,
    surveyId,
    matchId,
    awardsCreated,
    results,
    systemMessagePosted,
    errors
  };
}

