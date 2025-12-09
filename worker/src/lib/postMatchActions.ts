/**
 * Post-match actions handler
 * 
 * After stats complete, this module:
 * 1. Posts "Match report is live!" system message
 * 2. Creates voting survey if enabled
 * 3. Posts "Voting is open!" system message if survey created
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface PostMatchActionResult {
  matchReportMessagePosted: boolean;
  surveyCreated: boolean;
  surveyId?: string;
  votingMessagePosted: boolean;
  errors: string[];
}

/**
 * Handles post-match actions after stats processing completes
 */
export async function handlePostMatchActions(
  supabase: SupabaseClient,
  matchId: number,
  tenantId: string
): Promise<PostMatchActionResult> {
  const result: PostMatchActionResult = {
    matchReportMessagePosted: false,
    surveyCreated: false,
    votingMessagePosted: false,
    errors: []
  };

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📋 Starting post-match actions for match ${matchId}, tenant ${tenantId}`);

  try {
    // 1. Check if this is the latest match
    const isLatest = await isLatestMatch(supabase, matchId, tenantId);
    if (!isLatest) {
      console.log(`[${new Date().toISOString()}] ⏭️ Skipping post-match actions: match ${matchId} is not the latest match`);
      return result;
    }

    // 2. Post "Match report is live!" system message
    try {
      await postSystemMessage(supabase, tenantId, '📊 Match report is live!');
      result.matchReportMessagePosted = true;
      console.log(`[${new Date().toISOString()}] ✅ Posted match report system message`);
    } catch (error: any) {
      result.errors.push(`Failed to post match report message: ${error.message}`);
      console.error(`[${new Date().toISOString()}] ❌ Failed to post match report message:`, error);
    }

    // 3. Check if voting is enabled and create survey
    const votingConfig = await getVotingConfig(supabase, tenantId);
    
    if (!votingConfig.votingEnabled) {
      console.log(`[${new Date().toISOString()}] ⏭️ Skipping survey creation: voting is disabled`);
      return result;
    }

    // 4. Check if survey already exists
    const { data: existingSurvey } = await supabase
      .from('match_surveys')
      .select('id')
      .eq('match_id', matchId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingSurvey) {
      console.log(`[${new Date().toISOString()}] ⏭️ Skipping survey creation: survey already exists for match ${matchId}`);
      return result;
    }

    // 5. Create the survey
    try {
      const survey = await createSurvey(supabase, matchId, tenantId, votingConfig);
      if (survey) {
        result.surveyCreated = true;
        result.surveyId = survey.id;
        console.log(`[${new Date().toISOString()}] ✅ Created survey ${survey.id} for match ${matchId}`);

        // 6. Post "Voting is open!" system message
        try {
          await postSystemMessage(
            supabase, 
            tenantId, 
            `🗳️ Voting is open! Closes in ${votingConfig.durationHours}h`
          );
          result.votingMessagePosted = true;
          console.log(`[${new Date().toISOString()}] ✅ Posted voting open system message`);
        } catch (error: any) {
          result.errors.push(`Failed to post voting message: ${error.message}`);
          console.error(`[${new Date().toISOString()}] ❌ Failed to post voting message:`, error);
        }
      }
    } catch (error: any) {
      // Handle unique constraint violation (survey already exists - race condition)
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        console.log(`[${new Date().toISOString()}] ⏭️ Survey already exists (concurrent creation)`);
      } else {
        result.errors.push(`Failed to create survey: ${error.message}`);
        console.error(`[${new Date().toISOString()}] ❌ Failed to create survey:`, error);
      }
    }

  } catch (error: any) {
    result.errors.push(`Post-match actions failed: ${error.message}`);
    console.error(`[${new Date().toISOString()}] 🚨 Post-match actions error:`, error);
  }

  return result;
}

/**
 * Check if the given match is the latest (most recent by date)
 */
async function isLatestMatch(
  supabase: SupabaseClient,
  matchId: number,
  tenantId: string
): Promise<boolean> {
  const { data: latestMatch, error } = await supabase
    .from('matches')
    .select('match_id')
    .eq('tenant_id', tenantId)
    .order('match_date', { ascending: false })
    .order('match_id', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error checking latest match:', error);
    return false;
  }

  return latestMatch?.match_id === matchId;
}

interface VotingConfig {
  votingEnabled: boolean;
  momEnabled: boolean;
  dodEnabled: boolean;
  miaEnabled: boolean;
  durationHours: number;
}

/**
 * Get voting configuration for a tenant
 */
async function getVotingConfig(
  supabase: SupabaseClient,
  tenantId: string
): Promise<VotingConfig> {
  const { data: configs, error } = await supabase
    .from('app_config')
    .select('config_key, config_value')
    .eq('tenant_id', tenantId)
    .in('config_key', [
      'voting_enabled',
      'voting_mom_enabled',
      'voting_dod_enabled',
      'voting_mia_enabled',
      'voting_duration_hours'
    ]);

  if (error) {
    console.error('Error fetching voting config:', error);
  }

  // Create config map with defaults
  const configMap: Record<string, string> = {};
  (configs || []).forEach(c => {
    configMap[c.config_key] = c.config_value;
  });

  return {
    votingEnabled: configMap['voting_enabled'] !== 'false', // Default true
    momEnabled: configMap['voting_mom_enabled'] !== 'false', // Default true
    dodEnabled: configMap['voting_dod_enabled'] !== 'false', // Default true
    miaEnabled: configMap['voting_mia_enabled'] === 'true', // Default false
    durationHours: parseInt(configMap['voting_duration_hours'] || '12', 10)
  };
}

/**
 * Create a voting survey for a match
 */
async function createSurvey(
  supabase: SupabaseClient,
  matchId: number,
  tenantId: string,
  config: VotingConfig
): Promise<{ id: string } | null> {
  // Get eligible players (players who played in this match)
  const { data: playerMatches, error: playersError } = await supabase
    .from('player_matches')
    .select('player_id')
    .eq('match_id', matchId)
    .eq('tenant_id', tenantId);

  if (playersError) {
    throw new Error(`Failed to get players for match: ${playersError.message}`);
  }

  const eligiblePlayerIds = (playerMatches || []).map(pm => pm.player_id);

  if (eligiblePlayerIds.length === 0) {
    console.log('No eligible players found for survey');
    return null;
  }

  // Determine enabled categories
  const enabledCategories: string[] = [];
  if (config.momEnabled) enabledCategories.push('mom');
  if (config.dodEnabled) enabledCategories.push('dod');
  if (config.miaEnabled) enabledCategories.push('mia');

  if (enabledCategories.length === 0) {
    console.log('No voting categories enabled');
    return null;
  }

  // Calculate voting close time
  const votingClosesAt = new Date();
  votingClosesAt.setHours(votingClosesAt.getHours() + config.durationHours);

  // Create the survey
  const { data: survey, error: surveyError } = await supabase
    .from('match_surveys')
    .insert({
      tenant_id: tenantId,
      match_id: matchId,
      eligible_player_ids: eligiblePlayerIds,
      enabled_categories: enabledCategories,
      voting_closes_at: votingClosesAt.toISOString(),
      is_open: true
    })
    .select('id')
    .single();

  if (surveyError) {
    throw surveyError;
  }

  return survey;
}

/**
 * Post a system message to chat
 */
async function postSystemMessage(
  supabase: SupabaseClient,
  tenantId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      tenant_id: tenantId,
      content,
      is_system_message: true,
      author_player_id: null,
      mentions: []
    });

  if (error) {
    throw error;
  }
}

