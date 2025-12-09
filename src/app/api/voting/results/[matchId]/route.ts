/**
 * Voting Results API
 * 
 * GET /api/voting/results/[matchId] - Get voting results for a match
 * 
 * Only returns results after voting is closed (is_open = false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';

interface AwardWinner {
  playerId: number;
  playerName: string;
  voteCount: number;
  isCoWinner: boolean;
}

interface CategoryResults {
  winners: AwardWinner[];
  totalVotes: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      await requireAuth(request);
      
      const matchId = parseInt(params.matchId, 10);
      
      if (isNaN(matchId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid match ID' },
          { status: 400 }
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
      
      // Get the survey for this match
      const { data: survey, error: surveyError } = await supabase
        .from('match_surveys')
        .select('id, is_open, enabled_categories, results, closed_at')
        .eq('tenant_id', tenantId)
        .eq('match_id', matchId)
        .single();
      
      if (!survey || surveyError) {
        return NextResponse.json({
          success: true,
          hasSurvey: false,
          results: null
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // If survey is still open, don't reveal results
      if (survey.is_open) {
        return NextResponse.json({
          success: true,
          hasSurvey: true,
          votingOpen: true,
          results: null,
          message: 'Voting is still open'
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // Get awards from player_awards table (canonical source)
      const { data: awards, error: awardsError } = await supabase
        .from('player_awards')
        .select(`
          player_id,
          award_type,
          vote_count,
          is_co_winner,
          players (
            player_id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('match_id', matchId);
      
      if (awardsError) {
        console.error('Error fetching awards:', awardsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch results' },
          { status: 500 }
        );
      }
      
      // Format results by category
      const results: Record<string, CategoryResults> = {};
      const enabledCategories = survey.enabled_categories as string[];
      
      for (const category of enabledCategories) {
        const categoryAwards = awards?.filter(a => a.award_type === category) || [];
        const totalVotes = categoryAwards.reduce((sum, a) => sum + a.vote_count, 0);
        
        results[category] = {
          winners: categoryAwards.map(a => ({
            playerId: a.player_id,
            playerName: (a.players as any)?.name || 'Unknown',
            voteCount: a.vote_count,
            isCoWinner: a.is_co_winner
          })),
          totalVotes
        };
      }
      
      // Check if there are any winners at all
      const hasWinners = Object.values(results).some(r => r.winners.length > 0);
      
      return NextResponse.json({
        success: true,
        hasSurvey: true,
        votingOpen: false,
        hasWinners,
        closedAt: survey.closed_at,
        enabledCategories,
        results
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching voting results:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

