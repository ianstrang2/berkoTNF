import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch players for an upcoming match
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const upcomingMatchId = searchParams.get('upcoming_match_id');
    const activeOnly = searchParams.get('active') === 'true';

    let whereClause: any = {};
    
    if (upcomingMatchId) {
      // Use provided upcoming_match_id
      whereClause.upcoming_match_id = parseInt(upcomingMatchId);
    } else if (matchId) {
      // Get players for a specific match using matchId for backward compatibility
      whereClause.upcoming_match_id = parseInt(matchId);
    } else if (activeOnly) {
      // Get players for the active match
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true },
        select: { upcoming_match_id: true }
      });
      
      if (!activeMatch) {
        return NextResponse.json({ 
          success: true, 
          data: [], 
          message: 'No active match found' 
        });
      }
      
      whereClause.upcoming_match_id = activeMatch.upcoming_match_id;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Either matchId, upcoming_match_id, or active=true is required' 
      }, { status: 400 });
    }

    // Get players with their details
    const players = await prisma.upcoming_match_players.findMany({
      where: whereClause,
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
            is_ringer: true,
            is_retired: true,
            selected_club: true
          }
        }
      },
      orderBy: [
        { slot_number: 'asc' }, // First order by slot number
        { created_at: 'asc' } // Then by creation date as fallback
      ]
    });

    // Format the response for easier consumption by the frontend
    const formattedPlayers = players.map(p => ({
      id: p.player_id.toString(),
      pool_id: p.upcoming_player_id,
      responseStatus: 'PENDING',
      team: p.team || 'Unassigned',
      slot_number: p.slot_number,
      name: p.player.name,
      goalscoring: p.player.goalscoring,
      defending: p.player.defender,
      staminaPace: p.player.stamina_pace,
      control: p.player.control,
      teamwork: p.player.teamwork,
      resilience: p.player.resilience,
      isRinger: p.player.is_ringer,
      isRetired: p.player.is_retired,
      club: p.player.selected_club ? (typeof p.player.selected_club === 'string' ? JSON.parse(p.player.selected_club) : p.player.selected_club) : null
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedPlayers 
    });
  } catch (error: any) {
    console.error('Error fetching match players:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST: Add a player to an upcoming match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept either match_id or upcoming_match_id for backward compatibility
    let { player_id, match_id, upcoming_match_id, team, position, slot_number } = body;

    // Convert numeric parameters to integers
    player_id = player_id ? parseInt(player_id, 10) : null;
    match_id = match_id ? parseInt(match_id, 10) : null;
    upcoming_match_id = upcoming_match_id ? parseInt(upcoming_match_id, 10) : null;
    slot_number = slot_number ? parseInt(slot_number, 10) : null;

    if (!player_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    if (!slot_number) {
      return NextResponse.json({ 
        success: false, 
        error: 'Slot number is required' 
      }, { status: 400 });
    }

    // Use provided match ID (try both field names) or find the active match
    let targetMatchId = upcoming_match_id || match_id;
    
    if (!targetMatchId) {
      // Find the active match
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true },
        select: { 
          upcoming_match_id: true,
          team_size: true,
          _count: {
            select: { players: true }
          }
        }
      });

      if (!activeMatch) {
        return NextResponse.json({ 
          success: false, 
          error: 'No active match found' 
        }, { status: 404 });
      }
      
      targetMatchId = activeMatch.upcoming_match_id;
      
      // Check if match is full
      if (activeMatch._count.players >= activeMatch.team_size * 2) {
        return NextResponse.json({ 
          success: false, 
          error: `Match is full (${activeMatch._count.players}/${activeMatch.team_size * 2} players)` 
        }, { status: 400 });
      }
    }

    // First, check if any player is already assigned to this slot
    const existingPlayerInSlot = await prisma.upcoming_match_players.findFirst({
      where: {
        upcoming_match_id: targetMatchId,
        slot_number: slot_number
      }
    });

    // If there's a player in this slot, remove them first
    if (existingPlayerInSlot) {
      await prisma.upcoming_match_players.delete({
        where: {
          upcoming_player_id: existingPlayerInSlot.upcoming_player_id
        }
      });
    }

    // Then check if this player is already in another slot for this match
    const existingPlayerAssignment = await prisma.upcoming_match_players.findFirst({
      where: {
        upcoming_match_id: targetMatchId,
        player_id: player_id
      }
    });

    // If the player is already in another slot, remove that assignment
    if (existingPlayerAssignment) {
      await prisma.upcoming_match_players.delete({
        where: {
          upcoming_player_id: existingPlayerAssignment.upcoming_player_id
        }
      });
    }

    // Now add player to match in the specified slot
    const newAssignment = await prisma.upcoming_match_players.create({
      data: {
        team: team || 'A',
        slot_number: slot_number,
        player: {
          connect: { player_id: player_id }
        },
        match: {
          connect: { upcoming_match_id: targetMatchId }
        }
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
            is_ringer: true,
            is_retired: true,
            selected_club: true
          }
        }
      }
    });

    // Mark match as unbalanced when adding players
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: { is_balanced: false }
    });

    // Format response
    const formattedPlayer = {
      id: newAssignment.player_id.toString(),
      pool_id: newAssignment.upcoming_player_id,
      responseStatus: 'PENDING',
      team: newAssignment.team,
      slot_number: newAssignment.slot_number,
      name: newAssignment.player.name,
      goalscoring: newAssignment.player.goalscoring,
      defending: newAssignment.player.defender,
      staminaPace: newAssignment.player.stamina_pace,
      control: newAssignment.player.control,
      teamwork: newAssignment.player.teamwork,
      resilience: newAssignment.player.resilience,
      isRinger: newAssignment.player.is_ringer,
      isRetired: newAssignment.player.is_retired,
      club: newAssignment.player.selected_club ? (typeof newAssignment.player.selected_club === 'string' ? JSON.parse(newAssignment.player.selected_club) : newAssignment.player.selected_club) : null
    };

    return NextResponse.json({ 
      success: true, 
      data: formattedPlayer 
    });
  } catch (error: any) {
    console.error('Error adding player to match:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT: Update a player's assignment in an upcoming match
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { upcoming_match_id, player_id, team, slot_number } = body;

    if (!upcoming_match_id || !player_id) {
      return NextResponse.json(
        { success: false, error: 'Match ID and Player ID are required' },
        { status: 400 }
      );
    }

    // Find the specific upcoming_match_player record
    const assignment = await prisma.upcoming_match_players.findFirst({
      where: {
        upcoming_match_id: upcoming_match_id,
        player_id: player_id,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Player assignment not found for this match' },
        { status: 404 }
      );
    }

    // Update the record
    const updatedAssignment = await prisma.upcoming_match_players.update({
      where: {
        upcoming_player_id: assignment.upcoming_player_id,
      },
      data: {
        team: team,
        slot_number: slot_number,
      },
    });

    return NextResponse.json({ success: true, data: updatedAssignment });

  } catch (error: any) {
    console.error('Error updating player assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a player from an upcoming match
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('player_id');
    const matchId = searchParams.get('matchId');
    const upcomingMatchId = searchParams.get('upcoming_match_id');
    const slotNumber = searchParams.get('slot_number');
    const active = searchParams.get('active') === 'true';
    
    // If no params provided, check request body (for bulk deletion)
    if (!playerId && !slotNumber && !upcomingMatchId && !matchId && !active) {
      try {
        const body = await request.json();
        if (body && (body.player_id || body.upcoming_match_id || body.match_id)) {
          // Handle DELETE with JSON body
          return await handleDeleteWithBody(body);
        }
      } catch (parseError) {
        // If parsing fails, likely not a JSON body, continue with query params
        console.log('No JSON body in DELETE request, using query params');
      }
    }
    
    if (!playerId && !slotNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either Player ID or Slot Number is required' 
      }, { status: 400 });
    }
    
    // Determine which match to use
    let targetMatchId = upcomingMatchId ? parseInt(upcomingMatchId) : (matchId ? parseInt(matchId) : null);
    
    if (!targetMatchId && active) {
      // Try to find the active match
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true },
        select: { upcoming_match_id: true }
      });
      
      if (!activeMatch) {
        return NextResponse.json({ 
          success: false, 
          error: 'No active match found' 
        }, { status: 404 });
      }
      
      targetMatchId = activeMatch.upcoming_match_id;
    } else if (!targetMatchId && !active) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either matchId, upcoming_match_id, or active=true is required' 
      }, { status: 400 });
    }
    
    // Build the where clause based on available parameters
    let whereClause: any = {
      upcoming_match_id: targetMatchId
    };
    
    if (playerId) {
      whereClause.player_id = parseInt(playerId);
    }
    
    if (slotNumber) {
      whereClause.slot_number = parseInt(slotNumber);
    }
    
    // Find the assignment to get its ID
    const existingAssignment = await prisma.upcoming_match_players.findFirst({
      where: whereClause,
      select: {
        upcoming_player_id: true  // Make sure to select the primary key
      }
    });
    
    if (!existingAssignment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player assignment not found' 
      }, { status: 404 });
    }
    
    // Delete the player assignment using the primary key
    await prisma.upcoming_match_players.delete({
      where: {
        upcoming_player_id: existingAssignment.upcoming_player_id
      }
    });
    
    // Mark match as unbalanced when removing players
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: { is_balanced: false }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Player removed from match'
    });
  } catch (error: any) {
    console.error('Error removing player from match:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Helper function to handle DELETE with request body
async function handleDeleteWithBody(body: any) {
  let { player_id, match_id, upcoming_match_id } = body;
  
  // Convert numeric parameters to integers
  player_id = player_id ? parseInt(player_id, 10) : null;
  match_id = match_id ? parseInt(match_id, 10) : null;
  upcoming_match_id = upcoming_match_id ? parseInt(upcoming_match_id, 10) : null;
  
  // Determine which match to use
  let targetMatchId = upcoming_match_id || match_id;
  
  if (!targetMatchId) {
    // Try to find the active match
    const activeMatch = await prisma.upcoming_matches.findFirst({
      where: { is_active: true },
      select: { upcoming_match_id: true }
    });
    
    if (!activeMatch) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active match found and no match ID provided' 
      }, { status: 404 });
    }
    
    targetMatchId = activeMatch.upcoming_match_id;
  }
  
  // If no player_id is specified, delete all players from the match
  if (!player_id) {
    // Delete all players from this match
    await prisma.upcoming_match_players.deleteMany({
      where: { 
        upcoming_match_id: targetMatchId
      }
    });
    
    // Mark match as unbalanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: { is_balanced: false }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'All players removed from match'
    });
  }
  
  // Otherwise, delete just this player
  const existingAssignment = await prisma.upcoming_match_players.findFirst({
    where: {
      upcoming_match_id: targetMatchId,
      player_id: player_id
    },
    select: { upcoming_player_id: true }
  });
  
  if (!existingAssignment) {
    return NextResponse.json({ 
      success: false, 
      error: 'Player assignment not found' 
    }, { status: 404 });
  }
  
  // Delete the player assignment
  await prisma.upcoming_match_players.delete({
    where: {
      upcoming_player_id: existingAssignment.upcoming_player_id
    }
  });
  
  // Mark match as unbalanced when removing players
  await prisma.upcoming_matches.update({
    where: { upcoming_match_id: targetMatchId },
    data: { is_balanced: false }
  });
  
  return NextResponse.json({ 
    success: true,
    message: 'Player removed from match'
  });
} 