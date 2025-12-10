/**
 * Chat Unread Count API
 * 
 * GET /api/chat/unread-count - Get unread message count for badge
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
        // Graceful degradation - return 0 unread
        return NextResponse.json({
          success: true,
          unreadCount: 0
        }, {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Vary': 'Cookie'
          }
        });
      }
      
      // Get user chat state
      let userState = await prisma.chat_user_state.findUnique({
        where: {
          tenant_id_player_id: {
            tenant_id: tenantId,
            player_id: player.player_id
          }
        },
        select: { last_read_at: true }
      });
      
      if (!userState) {
        // Create state with current time (marks existing history as read)
        const now = new Date();
        try {
          userState = await prisma.chat_user_state.create({
            data: {
              tenant_id: tenantId,
              player_id: player.player_id,
              last_read_at: now
            },
            select: { last_read_at: true }
          });
        } catch (createError) {
          // If creation fails (race condition), try to get again
          userState = await prisma.chat_user_state.findUnique({
            where: {
              tenant_id_player_id: {
                tenant_id: tenantId,
                player_id: player.player_id
              }
            },
            select: { last_read_at: true }
          });
          
          if (!userState) {
            // Give up gracefully
            return NextResponse.json({
              success: true,
              unreadCount: 0
            }, {
              headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Vary': 'Cookie'
              }
            });
          }
        }
      }
      
      // Count messages since last_read_at (excluding soft-deleted)
      const count = await prisma.chat_messages.count({
        where: {
          tenant_id: tenantId,
          created_at: { gt: userState.last_read_at },
          deleted_at: null
        }
      });
      
      return NextResponse.json({
        success: true,
        unreadCount: count
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      // Return 0 instead of error to not break UI
      return NextResponse.json({
        success: true,
        unreadCount: 0
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

