import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring player swaps are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

// POST: Swap two players atomically in a single transaction
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // SECURITY: Verify admin access
      await requireAdminRole(request);
      const body = await request.json();
      const { upcoming_match_id, playerA, playerB, state_version } = body;

      console.log('Swap request received:', {
        upcoming_match_id,
        playerA,
        playerB,
        state_version
      });

      // Additional validation
      if (!playerA.player_id || !playerB.player_id) {
        console.error('Invalid player IDs:', { playerA, playerB });
        return NextResponse.json(
          { success: false, error: 'Invalid player IDs provided' },
          { status: 400 }
        );
      }

      // Validate required fields
      if (!upcoming_match_id || !playerA || !playerB) {
        return NextResponse.json(
          { success: false, error: 'Match ID and both players are required' },
          { status: 400 }
        );
      }

      // Validate player objects
      if (!playerA.player_id || !playerB.player_id) {
        return NextResponse.json(
          { success: false, error: 'Both players must have player_id' },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
      // Optional: Lock the match for concurrent swap protection
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${upcoming_match_id})`;

      // Lock the two player rows to prevent concurrent modifications
      const players = await tx.$queryRaw<Array<{
        upcoming_player_id: number;
        player_id: number;
        team: string;
        slot_number: number | null;
      }>>`
        SELECT upcoming_player_id, player_id, team, slot_number
        FROM upcoming_match_players
        WHERE upcoming_match_id = ${upcoming_match_id}
          AND player_id IN (${playerA.player_id}, ${playerB.player_id})
          AND tenant_id = ${tenantId}::uuid
        FOR UPDATE
      `;

      if (players.length !== 2) {
        throw new Error('One or both players not found in this match');
      }

      const playerARecord = players.find(p => p.player_id === playerA.player_id);
      const playerBRecord = players.find(p => p.player_id === playerB.player_id);

      if (!playerARecord || !playerBRecord) {
        throw new Error('Player records not found');
      }

      // Perform the atomic swap
      // Since constraint is not deferrable, temporarily move one player to avoid conflicts
      await tx.upcoming_match_players.update({
        where: { upcoming_player_id: playerARecord.upcoming_player_id },
        data: {
          team: 'Unassigned',
          slot_number: null,
        },
      });

      await tx.upcoming_match_players.update({
        where: { upcoming_player_id: playerBRecord.upcoming_player_id },
        data: {
          team: playerB.team,
          slot_number: playerB.team === 'Unassigned' ? null : playerB.slot_number,
        },
      });

      await tx.upcoming_match_players.update({
        where: { upcoming_player_id: playerARecord.upcoming_player_id },
        data: {
          team: playerA.team,
          slot_number: playerA.team === 'Unassigned' ? null : playerA.slot_number,
        },
      });

      // Mark match as unbalanced
      await tx.upcoming_matches.update({
        where: { upcoming_match_id: upcoming_match_id, tenant_id: tenantId },
        data: { is_balanced: false }
      });

      // Optional: Handle state_version for optimistic concurrency
      if (state_version !== undefined) {
        const updateResult = await tx.upcoming_matches.updateMany({
          where: { 
            upcoming_match_id: upcoming_match_id,
            tenant_id: tenantId,
            state_version: state_version
          },
          data: { state_version: { increment: 1 } }
        });
        
        if (updateResult.count === 0) {
          throw new Error('CONCURRENCY_CONFLICT');
        }
      }

        return { 
          playerA: { ...playerARecord, team: playerA.team, slot_number: playerA.slot_number },
          playerB: { ...playerBRecord, team: playerB.team, slot_number: playerB.slot_number }
        };
      });

      return NextResponse.json({ 
        success: true, 
        data: result,
        message: 'Players swapped successfully'
      });

    } catch (error: any) {
      console.error('Error swapping players:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      
      if (error.message === 'CONCURRENCY_CONFLICT') {
        return NextResponse.json(
          { success: false, error: 'Match was modified by another user. Please refresh and try again.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}
