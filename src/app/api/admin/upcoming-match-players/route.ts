import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch players for an upcoming match
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Get players assigned to this match
    const players = await prisma.upcoming_match_players.findMany({
      where: { upcoming_match_id: parseInt(matchId) },
      include: {
        player: {
          select: {
            name: true,
            goalscoring: true,
            defender: true,
            stamina_pace: true,
            control: true,
            teamwork: true,
            resilience: true,
            is_ringer: true
          }
        }
      },
      orderBy: [
        { team: 'asc' },
        { position: 'asc' }, 
        { slot_number: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: players
    });
  } catch (error) {
    console.error('Error fetching upcoming match players:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming match players' }, { status: 500 });
  }
}

// POST: Add a player to an upcoming match
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.upcoming_match_id || !body.player_id) {
      return NextResponse.json({ error: 'Match ID and player ID are required' }, { status: 400 });
    }

    // Check if player already exists in this match
    const existingPlayer = await prisma.upcoming_match_players.findFirst({
      where: {
        upcoming_match_id: body.upcoming_match_id,
        player_id: body.player_id
      }
    });

    if (existingPlayer) {
      return NextResponse.json({ 
        error: 'Player is already assigned to this match' 
      }, { status: 400 });
    }

    // Add player to the match
    const addedPlayer = await prisma.upcoming_match_players.create({
      data: {
        upcoming_match_id: body.upcoming_match_id,
        player_id: body.player_id,
        team: body.team,
        position: body.position,
        slot_number: body.slot_number
      },
      include: {
        player: {
          select: {
            name: true,
            goalscoring: true,
            defender: true,
            stamina_pace: true,
            control: true,
            teamwork: true,
            resilience: true,
            is_ringer: true
          }
        }
      }
    });

    // Update match to indicate teams are not balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: body.upcoming_match_id },
      data: { 
        is_balanced: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: addedPlayer
    });
  } catch (error) {
    console.error('Error adding player to upcoming match:', error);
    return NextResponse.json({ error: 'Failed to add player to upcoming match' }, { status: 500 });
  }
}

// PUT: Update a player's assignment in an upcoming match
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.upcoming_player_id) {
      return NextResponse.json({ error: 'Upcoming player ID is required' }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.team !== undefined) updateData.team = body.team;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.slot_number !== undefined) updateData.slot_number = body.slot_number;
    
    updateData.updated_at = new Date();

    // Update player assignment
    const updatedPlayer = await prisma.upcoming_match_players.update({
      where: { upcoming_player_id: body.upcoming_player_id },
      data: updateData,
      include: {
        player: {
          select: {
            name: true,
            goalscoring: true,
            defender: true,
            stamina_pace: true,
            control: true,
            teamwork: true,
            resilience: true,
            is_ringer: true
          }
        }
      }
    });

    // Get match ID from player record
    const matchId = updatedPlayer.upcoming_match_id;

    // Update match to indicate teams are not balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: matchId },
      data: { 
        is_balanced: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedPlayer
    });
  } catch (error) {
    console.error('Error updating player assignment:', error);
    return NextResponse.json({ error: 'Failed to update player assignment' }, { status: 500 });
  }
}

// DELETE: Remove a player from an upcoming match
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const matchId = searchParams.get('matchId');
    
    if (!playerId || !matchId) {
      return NextResponse.json({ error: 'Player ID and match ID are required' }, { status: 400 });
    }

    // Find the player assignment
    const playerAssignment = await prisma.upcoming_match_players.findFirst({
      where: {
        upcoming_match_id: parseInt(matchId),
        player_id: parseInt(playerId)
      }
    });

    if (!playerAssignment) {
      return NextResponse.json({ error: 'Player assignment not found' }, { status: 404 });
    }

    // Remove player from match
    await prisma.upcoming_match_players.delete({
      where: { upcoming_player_id: playerAssignment.upcoming_player_id }
    });

    // Update match to indicate teams are not balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: parseInt(matchId) },
      data: { 
        is_balanced: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: { 
        playerId: parseInt(playerId),
        matchId: parseInt(matchId)
      }
    });
  } catch (error) {
    console.error('Error removing player from upcoming match:', error);
    return NextResponse.json({ error: 'Failed to remove player from upcoming match' }, { status: 500 });
  }
} 