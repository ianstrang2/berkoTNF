/**
 * Chat Mark Read API
 * 
 * POST /api/chat/mark-read - Mark messages as read (updates last_read_at)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
      
      const now = new Date().toISOString();
      
      // Upsert user chat state
      const { error } = await supabase
        .from('chat_user_state')
        .upsert({
          tenant_id: tenantId,
          player_id: player.player_id,
          last_read_at: now
        }, {
          onConflict: 'tenant_id,player_id'
        });
      
      if (error) {
        console.error('Failed to mark messages as read:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to mark messages as read' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        lastReadAt: now
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
      
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

