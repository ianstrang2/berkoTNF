import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API route to lock the player pool for an upcoming match.
 * Transitions state from 'Draft' to 'PoolLocked'.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const match = await prisma.upcoming_matches.findUnique({
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
    
    const requiredPlayerCount = match.team_size * 2;
    if (playerIds.length !== requiredPlayerCount) {
        return NextResponse.json({ 
          success: false, 
          error: `Player count mismatch. Expected ${requiredPlayerCount}, got ${playerIds.length}.`
        }, { status: 409 });
    }

    const updatedMatch = await prisma.$transaction(async (tx) => {
      // 1. Clear any existing player pool for this match
      await tx.upcoming_match_players.deleteMany({
        where: { upcoming_match_id: matchId },
      });

      // 2. Create the new player pool
      await tx.upcoming_match_players.createMany({
        data: playerIds.map((playerId: number) => ({
          upcoming_match_id: matchId,
          player_id: playerId,
          team: 'Unassigned',
        })),
      });

      // 3. Update the match state
      const newMatchState = await tx.upcoming_matches.update({
        where: { 
          upcoming_match_id: matchId,
          state_version: state_version // Concurrency check
        } as any,
        data: {
          state: 'PoolLocked',
          state_version: {
            increment: 1,
          },
        } as any,
      });

      return newMatchState;
    });


    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
     if (error.code === 'P2025' || error.code === 'P2034') { // Prisma transaction errors for concurrency
        return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
    }
    console.error('Error locking pool:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 