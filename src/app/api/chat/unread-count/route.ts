/**
 * Chat Unread Count API
 * 
 * GET /api/chat/unread-count - Get unread message count for badge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
      
      // Get or create user chat state
      let { data: userState } = await supabase
        .from('chat_user_state')
        .select('last_read_at')
        .eq('tenant_id', tenantId)
        .eq('player_id', player.player_id)
        .single();
      
      if (!userState) {
        // Create state with current time (marks existing history as read)
        const { data: newState, error: createError } = await supabase
          .from('chat_user_state')
          .insert({
            tenant_id: tenantId,
            player_id: player.player_id,
            last_read_at: new Date().toISOString()
          })
          .select('last_read_at')
          .single();
        
        if (createError) {
          console.error('Failed to create chat user state:', createError);
          // Graceful degradation: return 0 unread
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
        
        userState = newState;
      }
      
      // Count messages since last_read_at (excluding soft-deleted)
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gt('created_at', userState.last_read_at)
        .is('deleted_at', null);
      
      if (countError) {
        console.error('Failed to count unread messages:', countError);
        return NextResponse.json(
          { success: false, error: 'Failed to count unread messages' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        unreadCount: count || 0
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error getting unread count:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

