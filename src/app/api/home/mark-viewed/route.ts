/**
 * Home Mark Viewed API
 * 
 * POST /api/home/mark-viewed - Mark the latest match report as viewed
 * 
 * Called when user navigates to the Home/Dashboard page.
 * Clears the Home badge.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAuth(request);
      
      // Get the current player
      const player = await prisma.players.findFirst({
        where: { auth_user_id: user.id, tenant_id: tenantId },
        select: { player_id: true }
      });
      
      if (!player) {
        return NextResponse.json({
          success: false,
          error: 'Player not found'
        }, { status: 404 });
      }
      
      // Get the latest completed match (score >= 0 filters out null)
      const latestMatch = await prisma.matches.findFirst({
        where: { 
          tenant_id: tenantId,
          team_a_score: { gte: 0 }
        },
        orderBy: [
          { match_date: 'desc' },
          { match_id: 'desc' }
        ],
        select: { match_id: true }
      });
      
      if (!latestMatch) {
        // No completed matches yet - nothing to mark
        return NextResponse.json({
          success: true,
          message: 'No matches to mark as viewed'
        });
      }
      
      // Upsert the user_app_state
      const now = new Date();
      await prisma.user_app_state.upsert({
        where: {
          tenant_id_player_id: {
            tenant_id: tenantId,
            player_id: player.player_id
          }
        },
        create: {
          tenant_id: tenantId,
          player_id: player.player_id,
          last_viewed_match_id: latestMatch.match_id,
          last_viewed_at: now
        },
        update: {
          last_viewed_match_id: latestMatch.match_id,
          last_viewed_at: now
        }
      });
      
      return NextResponse.json({
        success: true,
        matchId: latestMatch.match_id
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error marking home as viewed:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to mark as viewed'
      }, { status: 500 });
    }
  }).catch(handleTenantError);
}

