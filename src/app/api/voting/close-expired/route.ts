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
 *    f. Log to background_job_status for visibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { closeSurvey, SurveyToClose } from '@/lib/voting/closeSurvey';

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
    
    return await closeExpiredSurveys('cron');
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
    return await closeExpiredSurveys('manual');
  } catch (error: any) {
    console.error('Error in close-expired:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function closeExpiredSurveys(trigger: string) {
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
      const result = await closeSurvey(
        supabase,
        survey as SurveyToClose,
        now,
        { trigger }
      );
      closedSurveys.push(result.surveyId);
      if (result.errors.length > 0) {
        errors.push(...result.errors.map(e => `Survey ${survey.id}: ${e}`));
      }
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
