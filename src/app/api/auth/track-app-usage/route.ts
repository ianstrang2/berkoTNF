/**
 * Track App Usage API
 * 
 * POST /api/auth/track-app-usage
 * Sets has_used_app = true for current player
 * Called once when player logs in from Capacitor app
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAuth(request);
      
      // Find player by auth_user_id
      const player = await prisma.players.findFirst({
        where: withTenantFilter(tenantId, {
          auth_user_id: user.id
        }),
        select: {
          player_id: true,
          has_used_app: true,
          name: true,
        }
      });
      
      if (!player) {
        return NextResponse.json(
          { success: false, error: 'Player not found' },
          { status: 404 }
        );
      }
      
      // Only update if not already set (idempotent)
      if (!player.has_used_app) {
        await prisma.players.update({
          where: { player_id: player.player_id },
          data: { has_used_app: true }
        });
        
        console.log(`[APP_TRACKING] Player ${player.name} (${player.player_id}) marked as app user`);
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'App usage tracked'
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}


