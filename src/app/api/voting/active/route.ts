/**
 * Voting Active API
 * 
 * GET /api/voting/active - Get active survey for current user
 * 
 * Returns the currently active survey if:
 * 1. There is an open survey (is_open = true)
 * 2. The current user is eligible to vote (was in the match)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAuth(request);
      
      // Get the current player
      const player = await prisma.players.findFirst({
        where: { auth_user_id: user.id, tenant_id: tenantId },
        select: { player_id: true, name: true }
      });
      
      if (!player) {
        return NextResponse.json(
          { success: false, error: 'Player profile not found' },
          { status: 404 }
        );
      }
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      
      // Check for expired survey and close it lazily (in case cron hasn't run)
      const now = new Date().toISOString();
      
      // Find any open survey that should be closed
      const { data: expiredSurvey } = await supabase
        .from('match_surveys')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_open', true)
        .lt('voting_closes_at', now)
        .single();
      
      if (expiredSurvey) {
        // Lazy close the expired survey (delegate to close-expired endpoint logic)
        // For simplicity, just mark as closed here
        await supabase
          .from('match_surveys')
          .update({ is_open: false, closed_at: now })
          .eq('id', expiredSurvey.id);
        
        console.log(`[VOTING] Lazily closed expired survey ${expiredSurvey.id}`);
      }
      
      // Find active survey
      const { data: survey, error: surveyError } = await supabase
        .from('match_surveys')
        .select(`
          id,
          match_id,
          eligible_player_ids,
          enabled_categories,
          is_open,
          voting_closes_at,
          created_at,
          matches (
            match_id,
            match_date,
            team_a_score,
            team_b_score
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_open', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // No active survey
      if (!survey || surveyError) {
        return NextResponse.json({
          success: true,
          hasActiveSurvey: false,
          survey: null
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // Check if current player is eligible to vote
      const isEligible = (survey.eligible_player_ids as number[]).includes(player.player_id);
      
      if (!isEligible) {
        return NextResponse.json({
          success: true,
          hasActiveSurvey: true,
          isEligible: false,
          survey: {
            id: survey.id,
            matchId: survey.match_id,
            votingClosesAt: survey.voting_closes_at,
            message: "You weren't in this match, so you can't vote."
          }
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // Get eligible players info
      const { data: eligiblePlayers } = await supabase
        .from('players')
        .select('player_id, name, selected_club')
        .in('player_id', survey.eligible_player_ids as number[])
        .order('name');
      
      // Get current user's votes for this survey
      const { data: existingVotes } = await supabase
        .from('match_votes')
        .select('award_type, voted_for_player_id')
        .eq('survey_id', survey.id)
        .eq('voter_player_id', player.player_id);
      
      // Format votes as map
      const userVotes: Record<string, number | null> = {};
      if (existingVotes) {
        for (const vote of existingVotes) {
          userVotes[vote.award_type] = vote.voted_for_player_id;
        }
      }
      
      // Get total vote count for progress indicator
      const { count: voterCount } = await supabase
        .from('match_votes')
        .select('voter_player_id', { count: 'exact', head: true })
        .eq('survey_id', survey.id);
      
      // Get unique voters
      const { data: uniqueVoters } = await supabase
        .from('match_votes')
        .select('voter_player_id')
        .eq('survey_id', survey.id);
      
      const uniqueVoterCount = new Set(uniqueVoters?.map(v => v.voter_player_id) || []).size;
      
      // Calculate time remaining
      const closesAt = new Date(survey.voting_closes_at);
      const timeRemainingMs = closesAt.getTime() - Date.now();
      
      return NextResponse.json({
        success: true,
        hasActiveSurvey: true,
        isEligible: true,
        survey: {
          id: survey.id,
          matchId: survey.match_id,
          matchDate: (survey.matches as any)?.match_date,
          matchScore: {
            teamA: (survey.matches as any)?.team_a_score,
            teamB: (survey.matches as any)?.team_b_score
          },
          enabledCategories: survey.enabled_categories,
          eligiblePlayers: eligiblePlayers?.map(p => ({
            id: p.player_id,
            name: p.name,
            selectedClub: p.selected_club
          })) || [],
          userVotes,
          hasVoted: Object.keys(userVotes).length > 0,
          totalVoters: uniqueVoterCount,
          totalEligible: (survey.eligible_player_ids as number[]).length,
          votingClosesAt: survey.voting_closes_at,
          timeRemainingMs: Math.max(0, timeRemainingMs)
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching active survey:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

