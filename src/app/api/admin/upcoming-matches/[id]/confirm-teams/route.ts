import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API route to confirm balanced teams for an upcoming match.
 * Transitions state from 'PoolLocked' to 'TeamsBalanced'.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = parseInt(params.id, 10);
    const { state_version } = await request.json();

    if (isNaN(matchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
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
    
    if (match.state !== 'PoolLocked') {
      return NextResponse.json({ success: false, error: `Match with state ${match.state} cannot be confirmed.` }, { status: 409 });
    }

    if (match.state_version !== state_version) {
      return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
    }

    if (!match.is_balanced) {
        return NextResponse.json({ success: false, error: 'Teams must be balanced before they can be confirmed.' }, { status: 400 });
    }

    const updatedMatch = await prisma.upcoming_matches.update({
      where: { 
          upcoming_match_id: matchId,
          state_version: state_version
      },
      data: {
        state: 'TeamsBalanced',
        state_version: { increment: 1 }
      },
    });

    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
    if (error.code === 'P2025') { 
        return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
    }
    console.error('Error confirming teams:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 