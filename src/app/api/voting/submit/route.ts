/**
 * Voting Submit API
 * 
 * POST /api/voting/submit - Submit or update votes
 * 
 * Request body:
 * {
 *   surveyId: string;
 *   votes: {
 *     mom?: number | null;  // Player ID or null to clear
 *     dod?: number | null;
 *     mia?: number | null;
 *   }
 * }
 * 
 * - Passing a player ID creates/updates a vote
 * - Passing null deletes an existing vote (clears/skips)
 * - Omitting a key leaves that category unchanged
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

const VALID_CATEGORIES = ['mom', 'dod', 'mia'];

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAuth(request);
      
      const body = await request.json();
      const { surveyId, votes } = body;
      
      if (!surveyId) {
        return NextResponse.json(
          { success: false, error: 'Survey ID is required' },
          { status: 400 }
        );
      }
      
      if (!votes || typeof votes !== 'object') {
        return NextResponse.json(
          { success: false, error: 'Votes object is required' },
          { status: 400 }
        );
      }
      
      // Get the current player
      const player = await prisma.players.findFirst({
        where: { auth_user_id: user.id, tenant_id: tenantId },
        select: { player_id: true }
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
      
      // Get the survey
      const { data: survey, error: surveyError } = await supabase
        .from('match_surveys')
        .select('id, is_open, voting_closes_at, eligible_player_ids, enabled_categories')
        .eq('id', surveyId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (!survey || surveyError) {
        return NextResponse.json(
          { success: false, error: 'Survey not found' },
          { status: 404 }
        );
      }
      
      // Check if survey is still open
      if (!survey.is_open) {
        return NextResponse.json(
          { success: false, error: 'Survey is closed' },
          { status: 400 }
        );
      }
      
      // Check if voting window has passed
      const now = new Date();
      const closesAt = new Date(survey.voting_closes_at);
      if (now > closesAt) {
        // Lazily close the survey
        await supabase
          .from('match_surveys')
          .update({ is_open: false, closed_at: now.toISOString() })
          .eq('id', surveyId);
        
        return NextResponse.json(
          { success: false, error: 'Survey is closed' },
          { status: 400 }
        );
      }
      
      // Check if player is eligible to vote (was in the match)
      const eligiblePlayerIds = survey.eligible_player_ids as number[];
      if (!eligiblePlayerIds.includes(player.player_id)) {
        return NextResponse.json(
          { success: false, error: "You weren't marked as playing in that match when voting opened, so you can't vote." },
          { status: 400 }
        );
      }
      
      // Process votes
      const enabledCategories = survey.enabled_categories as string[];
      const errors: string[] = [];
      
      for (const [category, votedForPlayerId] of Object.entries(votes)) {
        // Validate category
        if (!VALID_CATEGORIES.includes(category)) {
          errors.push(`Invalid category: ${category}`);
          continue;
        }
        
        // Check if category is enabled for this survey
        if (!enabledCategories.includes(category)) {
          errors.push(`Category ${category} is not enabled for this survey`);
          continue;
        }
        
        if (votedForPlayerId === null) {
          // Delete existing vote (clear/skip)
          await supabase
            .from('match_votes')
            .delete()
            .eq('survey_id', surveyId)
            .eq('voter_player_id', player.player_id)
            .eq('award_type', category);
          
          console.log(`[VOTING] Cleared vote for ${category} by player ${player.player_id}`);
        } else if (typeof votedForPlayerId === 'number') {
          // Validate that voted-for player is eligible
          if (!eligiblePlayerIds.includes(votedForPlayerId)) {
            errors.push(`Player ${votedForPlayerId} is not eligible for ${category}`);
            continue;
          }
          
          // Upsert vote
          const { error: upsertError } = await supabase
            .from('match_votes')
            .upsert({
              tenant_id: tenantId,
              survey_id: surveyId,
              voter_player_id: player.player_id,
              award_type: category,
              voted_for_player_id: votedForPlayerId,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'survey_id,voter_player_id,award_type'
            });
          
          if (upsertError) {
            console.error(`Failed to upsert vote for ${category}:`, upsertError);
            errors.push(`Failed to save vote for ${category}`);
          } else {
            console.log(`[VOTING] Vote for ${category}: player ${player.player_id} -> ${votedForPlayerId}`);
          }
        }
        // If undefined or not null/number, leave unchanged (no action)
      }
      
      if (errors.length > 0) {
        return NextResponse.json({
          success: false,
          error: errors.join('; ')
        }, {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Votes submitted'
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error submitting votes:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

