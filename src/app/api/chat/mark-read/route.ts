/**
 * Chat Mark Read API
 * 
 * POST /api/chat/mark-read - Mark messages as read (updates last_read_at)
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
        // Graceful degradation - return success but no-op
        return NextResponse.json({
          success: true,
          lastReadAt: null,
          message: 'No player profile linked'
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      const now = new Date();
      
      // Use Prisma for upsert (more reliable than Supabase client)
      await prisma.chat_user_state.upsert({
        where: {
          tenant_id_player_id: {
            tenant_id: tenantId,
            player_id: player.player_id
          }
        },
        create: {
          tenant_id: tenantId,
          player_id: player.player_id,
          last_read_at: now
        },
        update: {
          last_read_at: now
        }
      });
      
      return NextResponse.json({
        success: true,
        lastReadAt: now.toISOString()
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      // Return success anyway to not break UI
      return NextResponse.json({
        success: true,
        lastReadAt: null,
        warning: 'Could not update read status'
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

