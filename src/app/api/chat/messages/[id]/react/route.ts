/**
 * Chat Reaction API
 * 
 * POST /api/chat/messages/[id]/react - Toggle reaction on a message
 * Body: { emoji: string }
 * 
 * If reaction exists, removes it (toggle off)
 * If reaction doesn't exist, adds it (toggle on)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

const ALLOWED_EMOJIS = ['👍', '😂', '🔥', '❤️', '😮', '👎'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAuth(request);
      const messageId = params.id;
      
      const body = await request.json();
      const { emoji } = body;
      
      if (!messageId) {
        return NextResponse.json(
          { success: false, error: 'Message ID is required' },
          { status: 400 }
        );
      }
      
      if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return NextResponse.json(
          { success: false, error: `Invalid emoji. Allowed: ${ALLOWED_EMOJIS.join(' ')}` },
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
      
      // Get the message
      const message = await prisma.chat_messages.findFirst({
        where: { 
          id: messageId, 
          tenant_id: tenantId 
        },
        select: {
          id: true,
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
      
      // Can't react to deleted messages
      if (message.deleted_at) {
        return NextResponse.json(
          { success: false, error: 'Cannot react to deleted messages' },
          { status: 400 }
        );
      }
      
      // Can't react to system messages
      if (message.is_system_message) {
        return NextResponse.json(
          { success: false, error: 'Cannot react to system messages' },
          { status: 400 }
        );
      }
      
      // Use Supabase client to toggle reaction (triggers Realtime)
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      
      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('player_id', player.player_id)
        .eq('emoji', emoji)
        .single();
      
      let action: 'added' | 'removed';
      
      if (existingReaction) {
        // Remove reaction (toggle off)
        const { error } = await supabase
          .from('chat_reactions')
          .delete()
          .eq('id', existingReaction.id);
        
        if (error) {
          console.error('Failed to remove reaction:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to remove reaction' },
            { status: 500 }
          );
        }
        action = 'removed';
      } else {
        // Add reaction (toggle on)
        const { error } = await supabase
          .from('chat_reactions')
          .insert({
            tenant_id: tenantId,
            message_id: messageId,
            player_id: player.player_id,
            emoji
          });
        
        if (error) {
          console.error('Failed to add reaction:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to add reaction' },
            { status: 500 }
          );
        }
        action = 'added';
      }
      
      return NextResponse.json({
        success: true,
        action,
        emoji
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error toggling reaction:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

