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
            resilience: true
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
      player_id: p.player_id,
      match_id: p.upcoming_match_id,
      upcoming_match_id: p.upcoming_match_id,
      team: p.team,
      position: p.position,
      slot_number: p.slot_number,
      player_match_id: p.upcoming_player_id, // Include this for updates
      ...p.player
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
            resilience: true
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
      player_id: newAssignment.player_id,
      match_id: newAssignment.upcoming_match_id,
      upcoming_match_id: newAssignment.upcoming_match_id,
      team: newAssignment.team,
      slot_number: newAssignment.slot_number,
      ...newAssignment.player
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

// PUT: Update a player's team or position in an upcoming match
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Check if the player assignment exists
    const existingAssignment = await prisma.upcoming_match_players.findFirst({
      where: {
        upcoming_match_id: targetMatchId,
        player_id: player_id
      }
    });

    if (!existingAssignment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player is not assigned to this match' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (team !== undefined) {
      updateData.team = team;
    }
    
    if (slot_number !== undefined) {
      updateData.slot_number = slot_number;
    }
    
    // Update the player's team/slot
    const updatedAssignment = await prisma.upcoming_match_players.update({
      where: {
        upcoming_player_id: existingAssignment.upcoming_player_id
      },
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
            resilience: true
          }
        }
      }
    });

    // Format response
    const formattedPlayer = {
      player_id: updatedAssignment.player_id,
      match_id: updatedAssignment.upcoming_match_id,
      upcoming_match_id: updatedAssignment.upcoming_match_id, 
      team: updatedAssignment.team,
      slot_number: updatedAssignment.slot_number,
      ...updatedAssignment.player
    };

    return NextResponse.json({ 
      success: true, 
      data: formattedPlayer 
    });
  } catch (error: any) {
    console.error('Error updating player in match:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE: Remove a player from an upcoming match
export async function DELETE(request: NextRequest) {
  try {
    // First try to parse the request body, as this is how the frontend is sending data
    let bodyData: any = null;
    
    try {
      bodyData = await request.json();
    } catch (parseError) {
      // If parsing fails, it's not a JSON body - we'll use query params instead
      console.log('No JSON body in DELETE request, using query params');
    }
    
    // If we got a valid JSON body with required fields, use it
    if (bodyData && (bodyData.player_id || bodyData.upcoming_match_id || bodyData.match_id)) {
      return await handleDeleteWithBody(bodyData);
    }
    
    // Otherwise, fall back to query parameters
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const matchId = searchParams.get('matchId');
    const upcomingMatchId = searchParams.get('upcoming_match_id');
    const slotNumber = searchParams.get('slotNumber');
    const active = searchParams.get('active') === 'true';
    
    if (!playerId && !slotNumber && !upcomingMatchId && !matchId && !active) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either Player ID, Slot Number, or Match ID is required' 
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