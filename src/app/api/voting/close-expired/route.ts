/**
 * Voting Close Expired API
 * 
 * POST /api/voting/close-expired - Close expired surveys and tally results
 * 
 * Called by Vercel cron job every 30 minutes.
 * Also supports lazy evaluation when accessed via GET.
 * 
 * Process:
 * 1. Find all surveys where is_open=true AND voting_closes_at < now
 * 2. For each expired survey:
 *    a. Tally votes per category
 *    b. Determine winners (handle ties → co-winners)
 *    c. Insert player_awards records
 *    d. Update survey with is_open=false, results JSON, closed_at
 *    e. Post system message to chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postSystemMessage } from '@/lib/chat/systemMessage';

// Cron jobs need to be public (no auth required)
// But we validate the cron secret for POST requests

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow requests without auth in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    return await closeExpiredSurveys();
  } catch (error: any) {
    console.error('Error in close-expired cron:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET also supported for manual triggering / lazy evaluation
export async function GET() {
  try {
    return await closeExpiredSurveys();
  } catch (error: any) {
    console.error('Error in close-expired:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function closeExpiredSurveys() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const now = new Date().toISOString();
  
  // Find all expired but still open surveys
  const { data: expiredSurveys, error: findError } = await supabase
    .from('match_surveys')
    .select('id, tenant_id, match_id, enabled_categories, eligible_player_ids')
    .eq('is_open', true)
    .lt('voting_closes_at', now);
  
  if (findError) {
    console.error('Error finding expired surveys:', findError);
    return NextResponse.json(
      { success: false, error: 'Failed to find expired surveys' },
      { status: 500 }
    );
  }
  
  if (!expiredSurveys || expiredSurveys.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No expired surveys to close',
      closedCount: 0
    });
  }
  
  console.log(`[VOTING] Found ${expiredSurveys.length} expired survey(s) to close`);
  
  const closedSurveys: string[] = [];
  const errors: string[] = [];
  
  for (const survey of expiredSurveys) {
    try {
      await closeSurvey(supabase, survey, now);
      closedSurveys.push(survey.id);
    } catch (err: any) {
      console.error(`Failed to close survey ${survey.id}:`, err);
      errors.push(`Survey ${survey.id}: ${err.message}`);
    }
  }
  
  return NextResponse.json({
    success: true,
    message: `Closed ${closedSurveys.length} survey(s)`,
    closedCount: closedSurveys.length,
    closedSurveyIds: closedSurveys,
    errors: errors.length > 0 ? errors : undefined
  });
}

async function closeSurvey(
  supabase: ReturnType<typeof createClient>,
  survey: {
    id: string;
    tenant_id: string;
    match_id: number;
    enabled_categories: string[];
    eligible_player_ids: number[];
  },
  closedAt: string
) {
  const { id: surveyId, tenant_id: tenantId, match_id: matchId, enabled_categories: categories } = survey;
  
  console.log(`[VOTING] Closing survey ${surveyId} for match ${matchId}`);
  
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
        survey_id: surveyId,
        award_type: category,
        vote_count: categoryVotes[playerId],
        is_co_winner: isCoWinner
      });
      hasAnyWinners = true;
    }
  }
  
  // Insert awards (if any)
  if (awardsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('player_awards')
      .insert(awardsToInsert);
    
    if (insertError) {
      console.error('Failed to insert awards:', insertError);
      // Don't throw - still close the survey
    } else {
      console.log(`[VOTING] Inserted ${awardsToInsert.length} award(s) for survey ${surveyId}`);
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
  
  try {
    await postSystemMessage({ tenantId, content: systemMessage });
    console.log(`[VOTING] Posted system message for survey ${surveyId}`);
  } catch (msgError) {
    console.error('Failed to post system message:', msgError);
    // Don't throw - survey is already closed
  }
  
  console.log(`[VOTING] Successfully closed survey ${surveyId}`);
}

