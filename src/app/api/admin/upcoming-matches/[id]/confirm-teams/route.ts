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

    // Check if all team slots are properly filled
    const teamPlayers = await prisma.upcoming_match_players.findMany({
      where: { 
        upcoming_match_id: matchId,
        team: { in: ['A', 'B'] }
      }
    });

    const teamAPlayers = teamPlayers.filter(p => p.team === 'A');
    const teamBPlayers = teamPlayers.filter(p => p.team === 'B');

    // Verify we have the right number of players
    if (teamAPlayers.length !== match.actual_size_a || teamBPlayers.length !== match.actual_size_b) {
      return NextResponse.json({ 
        success: false, 
        error: `Teams incomplete. Need ${match.actual_size_a} players for Orange, ${match.actual_size_b} for Green.` 
      }, { status: 400 });
    }

    // Verify all players have slot assignments
    const teamASlots = teamAPlayers.map(p => p.slot_number).filter(slot => slot !== null);
    const teamBSlots = teamBPlayers.map(p => p.slot_number).filter(slot => slot !== null);

    if (teamASlots.length !== match.actual_size_a || teamBSlots.length !== match.actual_size_b) {
      return NextResponse.json({ 
        success: false, 
        error: 'All players must have position assignments before confirming teams.' 
      }, { status: 400 });
    }

    // Check for duplicate slots within each team
    const uniqueTeamASlots = new Set(teamASlots);
    const uniqueTeamBSlots = new Set(teamBSlots);

    if (uniqueTeamASlots.size !== match.actual_size_a || uniqueTeamBSlots.size !== match.actual_size_b) {
      return NextResponse.json({ 
        success: false, 
        error: 'Duplicate position assignments detected. Each position must be unique within each team.' 
      }, { status: 400 });
    }

    // Check if slot numbers are within valid range
    const invalidTeamASlots = teamASlots.some(slot => !slot || slot < 1 || slot > match.actual_size_a!);
    const invalidTeamBSlots = teamBSlots.some(slot => !slot || slot < 1 || slot > match.actual_size_b!);

    if (invalidTeamASlots || invalidTeamBSlots) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid position assignments detected. Positions must be between 1 and team size.' 
      }, { status: 400 });
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