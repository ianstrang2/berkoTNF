/**
 * Home Badge API
 * 
 * GET /api/home/badge - Check if there's a new match report to view
 * 
 * Returns hasNewReport: true if the latest match is different from user's last viewed match
 */

import { NextRequest, NextResponse } from 'next/server';
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
        select: { player_id: true }
      });
      
      if (!player) {
        // Graceful degradation - no badge
        return NextResponse.json({
          success: true,
          hasNewReport: false
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // Get the latest completed match (one with a match report)
      const latestMatch = await prisma.matches.findFirst({
        where: { 
          tenant_id: tenantId,
          // Only count matches that have team assignments (i.e., completed)
          team_a_score: { not: null }
        },
        orderBy: [
          { match_date: 'desc' },
          { match_id: 'desc' }
        ],
        select: { match_id: true }
      });
      
      if (!latestMatch) {
        // No completed matches - no badge
        return NextResponse.json({
          success: true,
          hasNewReport: false
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // Get user's app state
      const userState = await prisma.user_app_state.findUnique({
        where: {
          tenant_id_player_id: {
            tenant_id: tenantId,
            player_id: player.player_id
          }
        },
        select: { last_viewed_match_id: true }
      });
      
      // If user has never viewed any match, or viewed match is different from latest
      const hasNewReport = !userState || 
        userState.last_viewed_match_id === null || 
        userState.last_viewed_match_id !== latestMatch.match_id;
      
      return NextResponse.json({
        success: true,
        hasNewReport,
        latestMatchId: latestMatch.match_id,
        lastViewedMatchId: userState?.last_viewed_match_id || null
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error checking home badge:', error);
      // Return no badge instead of error to not break UI
      return NextResponse.json({
        success: true,
        hasNewReport: false
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
    }
  }).catch(handleTenantError);
}

