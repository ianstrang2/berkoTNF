/**
 * Chat Message Delete API
 * 
 * DELETE /api/chat/messages/[id] - Delete a message
 *   - Player can delete own message within 5 minutes
 *   - Admin can delete any message (no time limit)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

const DELETE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAuth(request);
      const messageId = params.id;
      
      if (!messageId) {
        return NextResponse.json(
          { success: false, error: 'Message ID is required' },
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
      
      // Check if user is admin
      const adminProfile = await prisma.admin_profiles.findFirst({
        where: { user_id: user.id, tenant_id: tenantId },
        select: { user_role: true }
      });
      
      const isAdmin = adminProfile?.user_role === 'admin' || adminProfile?.user_role === 'superadmin';
      
      // Get the message
      const message = await prisma.chat_messages.findFirst({
        where: { 
          id: messageId, 
          tenant_id: tenantId 
        },
        select: {
          id: true,
          author_player_id: true,
          created_at: true,
          deleted_at: true,
          is_system_message: true
        }
      });
      
      if (!message) {
        return NextResponse.json(
          { success: false, error: 'Message not found' },
          { status: 404 }
        );
      }
      
      // Can't delete already deleted messages
      if (message.deleted_at) {
        return NextResponse.json(
          { success: false, error: 'Message is already deleted' },
          { status: 400 }
        );
      }
      
      // Can't delete system messages
      if (message.is_system_message) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete system messages' },
          { status: 403 }
        );
      }
      
      // Check authorization
      const isOwnMessage = message.author_player_id === player.player_id;
      
      if (!isAdmin && !isOwnMessage) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete other users\' messages' },
          { status: 403 }
        );
      }
      
      // Check time window for non-admins
      if (!isAdmin && isOwnMessage) {
        const messageAge = Date.now() - new Date(message.created_at).getTime();
        if (messageAge > DELETE_WINDOW_MS) {
          return NextResponse.json(
            { success: false, error: 'Can only delete messages within 5 minutes' },
            { status: 400 }
          );
        }
      }
      
      // Soft-delete message AND hard-delete reactions in same transaction
      await prisma.$transaction([
        prisma.chat_messages.update({
          where: { id: messageId },
          data: { 
            deleted_at: new Date(), 
            deleted_by_player_id: player.player_id 
          }
        }),
        prisma.chat_reactions.deleteMany({
          where: { message_id: messageId }
        })
      ]);
      
      console.log(`[CHAT_DELETE] Message ${messageId} deleted by player ${player.player_id} (admin: ${isAdmin})`);
      
      return NextResponse.json({
        success: true,
        message: 'Message deleted'
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

