import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { splitSizesFromPool, getPoolValidation, MIN_PLAYERS, MAX_PLAYERS, MIN_TEAM } from '@/utils/teamSplit.util';
// Multi-tenant imports - ensuring pool locking is tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';
import { withTenantMatchLock } from '@/lib/tenantLocks';

/**
 * API route to lock the player pool for an upcoming match.
 * Transitions state from 'Draft' to 'PoolLocked'.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Multi-tenant setup - ensure pool locking is tenant-scoped
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    const matchId = parseInt(params.id, 10);
    const { playerIds, state_version } = await request.json();

    if (isNaN(matchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
    }
    
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ success: false, error: 'playerIds must be a non-empty array' }, { status: 400 });
    }

    if (typeof state_version !== 'number') {
      return NextResponse.json({ success: false, error: 'state_version is required' }, { status: 400 });
    }

    // Multi-tenant: Query scoped to current tenant only
    const match = await tenantPrisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchId },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    if (match.state !== 'Draft') {
      return NextResponse.json({ success: false, error: `Match with state ${match.state} cannot be locked.` }, { status: 409 });
    }
    
    if (match.state_version !== state_version) {
      return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
    }
    
    // Enhanced validation with support for uneven teams
    const poolSize = playerIds.length;
    const { a: sizeA, b: sizeB } = splitSizesFromPool(poolSize);
    const { disabled, blocked } = getPoolValidation(poolSize);

    // Validation checks using constants
    if (disabled) {
      return NextResponse.json({ 
        success: false, 
        error: `Too many players (max ${MAX_PLAYERS} for 11v11). Got ${poolSize}.`
      }, { status: 400 });
    }

    if (blocked) {
      return NextResponse.json({ 
        success: false, 
        error: `Too few for 4v4 minimum (need ${MIN_PLAYERS}+ players). Got ${poolSize}.`
      }, { status: 400 });
    }

    // Both teams must have at least MIN_TEAM players (defensive check)
    if (sizeA < MIN_TEAM || sizeB < MIN_TEAM) {
      return NextResponse.json({ 
        success: false, 
        error: `Teams too small (${sizeA}v${sizeB}). Both teams need ${MIN_TEAM}+ players.`
      }, { status: 400 });
    }

    // Validate unique player IDs to prevent data corruption
    if (new Set(playerIds).size !== playerIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate player IDs detected'
      }, { status: 400 });
    }

    // Multi-tenant: Use tenant-aware transaction with advisory locking
    const updatedMatch = await withTenantMatchLock(tenantId, matchId, async (tx) => {
      // 1. Clear any existing player pool for this match (tenant-scoped)
      await tx.upcoming_match_players.deleteMany({
        where: { 
          upcoming_match_id: matchId,
          tenant_id: tenantId
        },
      });

      // 2. Create the new player pool (tenant-scoped)
      await tx.upcoming_match_players.createMany({
        data: playerIds.map((playerId: number) => ({
          upcoming_match_id: matchId,
          player_id: playerId,
          tenant_id: tenantId,
          team: 'Unassigned'
        })),
      });

      // 3. Update the match state with actual team sizes (tenant-scoped)
      const newMatchState = await tx.upcoming_matches.update({
        where: { 
          upcoming_match_id: matchId,
          tenant_id: tenantId,
          state_version: state_version // Concurrency check
        } as any,
        data: {
          state: 'PoolLocked',
          actual_size_a: sizeA,      // NEW: Persist actual team sizes
          actual_size_b: sizeB,      // NEW: Source of truth for downstream
          state_version: {
            increment: 1,
          },
        } as any,
      });

      return newMatchState;
    });


    const isSimplified = poolSize === 8; // Exactly 4v4
    const isUneven = sizeA !== sizeB; // Any uneven split

    return NextResponse.json({ 
      success: true, 
      data: updatedMatch,
      splitInfo: { sizeA, sizeB, isUneven, isSimplified }
    });
  } catch (error: any) {
     if (error.code === 'P2025' || error.code === 'P2034') { // Prisma transaction errors for concurrency
        return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
    }
    console.error('Error locking pool:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 