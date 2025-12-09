/**
 * Chat Messages API
 * 
 * POST /api/chat/messages - Send a new message
 * GET /api/chat/messages - Get messages (paginated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

const MAX_MESSAGE_LENGTH = 500;
const MAX_MENTIONS = 10;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * POST /api/chat/messages - Send a new message
 */
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // Require authentication (any player can chat)
      const { user } = await requireAuth(request);
      
      const body = await request.json();
      const { content, mentions } = body;
      
      // Validate content
      if (!content || typeof content !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Message content is required' },
          { status: 400 }
        );
      }
      
      if (content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          { success: false, error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` },
          { status: 400 }
        );
      }
      
      // Validate mentions
      const validMentions = Array.isArray(mentions) 
        ? mentions.filter(id => typeof id === 'number').slice(0, MAX_MENTIONS)
        : [];
      
      // Get the player ID for the current user
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
      
      // Use Supabase client to insert (triggers Realtime)
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          tenant_id: tenantId,
          author_player_id: player.player_id,
          content: content.trim(),
          mentions: validMentions,
          is_system_message: false
        })
        .select(`
          id,
          content,
          mentions,
          is_system_message,
          created_at,
          author_player_id
        `)
        .single();
      
      if (error) {
        console.error('Failed to create message:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to send message' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: {
          id: message.id,
          content: message.content,
          author: {
            id: player.player_id,
            name: player.name
          },
          mentions: message.mentions,
          createdAt: message.created_at,
          reactions: []
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

/**
 * GET /api/chat/messages - Get messages (paginated)
 * Query params:
 *   - before: message_id (UUID) - for pagination
 *   - limit: number (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // Require authentication
      await requireAuth(request);
      
      const { searchParams } = new URL(request.url);
      const before = searchParams.get('before');
      const limitParam = searchParams.get('limit');
      
      const limit = Math.min(
        Math.max(1, parseInt(limitParam || String(DEFAULT_LIMIT), 10)),
        MAX_LIMIT
      );
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      
      // Build query
      let query = supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          mentions,
          is_system_message,
          created_at,
          deleted_at,
          author_player_id,
          players!chat_messages_author_player_id_fkey (
            player_id,
            name,
            selected_club
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1); // Fetch one extra to check hasMore
      
      // Handle pagination with cursor
      if (before) {
        // Get the anchor message's created_at
        const { data: anchorMessage } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('id', before)
          .single();
        
        if (anchorMessage) {
          query = query.lt('created_at', anchorMessage.created_at);
        }
        // If anchor not found (deleted by cleanup), just return empty with hasMore: false
      }
      
      const { data: messages, error } = await query;
      
      if (error) {
        console.error('Failed to fetch messages:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch messages' },
          { status: 500 }
        );
      }
      
      // Check if there are more messages
      const hasMore = messages && messages.length > limit;
      const resultMessages = hasMore ? messages.slice(0, limit) : (messages || []);
      
      // Get reactions for these messages
      const messageIds = resultMessages.map(m => m.id);
      const { data: reactions } = await supabase
        .from('chat_reactions')
        .select('message_id, emoji, player_id')
        .in('message_id', messageIds);
      
      // Group reactions by message
      const reactionsByMessage = new Map<string, Array<{ emoji: string; playerIds: number[] }>>();
      if (reactions) {
        reactions.forEach(r => {
          const existing = reactionsByMessage.get(r.message_id) || [];
          const emojiEntry = existing.find(e => e.emoji === r.emoji);
          if (emojiEntry) {
            emojiEntry.playerIds.push(r.player_id);
          } else {
            existing.push({ emoji: r.emoji, playerIds: [r.player_id] });
          }
          reactionsByMessage.set(r.message_id, existing);
        });
      }
      
      // Format response
      const formattedMessages = resultMessages.map(m => {
        const messageReactions = reactionsByMessage.get(m.id) || [];
        const player = m.players as any;
        
        return {
          id: m.id,
          content: m.deleted_at ? '[This message was deleted]' : m.content,
          isDeleted: !!m.deleted_at,
          isSystemMessage: m.is_system_message,
          author: player ? {
            id: player.player_id,
            name: player.name,
            selectedClub: player.selected_club
          } : null,
          mentions: m.mentions,
          createdAt: m.created_at,
          reactions: messageReactions.map(r => ({
            emoji: r.emoji,
            count: r.playerIds.length,
            playerIds: r.playerIds
          }))
        };
      });
      
      return NextResponse.json({
        success: true,
        messages: formattedMessages,
        hasMore: hasMore || false
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

