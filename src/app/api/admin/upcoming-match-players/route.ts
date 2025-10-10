import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match player operations are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// GET: Fetch players for an upcoming match
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
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
      // Multi-tenant: Query scoped to current tenant only
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true, tenant_id: tenantId },
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
    // Multi-tenant: Query scoped to current tenant only
    const players = await prisma.upcoming_match_players.findMany({
      where: { ...whereClause, tenant_id: tenantId },
      include: {
        players: {
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
      name: (p as any).players?.name,
      goalscoring: (p as any).players?.goalscoring,
      defending: (p as any).players?.defender,
      staminaPace: (p as any).players?.stamina_pace,
      control: (p as any).players?.control,
      teamwork: (p as any).players?.teamwork,
      resilience: (p as any).players?.resilience,
      isRinger: (p as any).players?.is_ringer,
      isRetired: (p as any).players?.is_retired,
      club: (p as any).players?.selected_club ? (typeof (p as any).players.selected_club === 'string' ? JSON.parse((p as any).players.selected_club) : (p as any).players.selected_club) : null
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
  }).catch(handleTenantError);
}

// POST: Add a player to an upcoming match
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
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
          where: { is_active: true, tenant_id: tenantId },
          select: { 
            upcoming_match_id: true,
            team_size: true,
            _count: {
              select: { upcoming_match_players: true }
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
        if ((activeMatch as any)._count.upcoming_match_players >= activeMatch.team_size * 2) {
          return NextResponse.json({ 
            success: false, 
            error: `Match is full (${(activeMatch as any)._count.upcoming_match_players}/${activeMatch.team_size * 2} players)` 
          }, { status: 400 });
        }
      }

      // First, check if any player is already assigned to this slot
      const existingPlayerInSlot = await prisma.upcoming_match_players.findFirst({
        where: {
          upcoming_match_id: targetMatchId,
          slot_number: slot_number,
          tenant_id: tenantId
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
          player_id: player_id,
          tenant_id: tenantId
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
          tenant_id: tenantId,
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
          players: {
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
        where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
        data: { is_balanced: false }
      });

      // Format response
      const formattedPlayer = {
        id: newAssignment.player_id.toString(),
        pool_id: newAssignment.upcoming_player_id,
        responseStatus: 'PENDING',
        team: newAssignment.team,
        slot_number: newAssignment.slot_number,
        name: (newAssignment as any).players.name,
        goalscoring: (newAssignment as any).players.goalscoring,
        defending: (newAssignment as any).players.defender,
        staminaPace: (newAssignment as any).players.stamina_pace,
        control: (newAssignment as any).players.control,
        teamwork: (newAssignment as any).players.teamwork,
        resilience: (newAssignment as any).players.resilience,
        isRinger: (newAssignment as any).players.is_ringer,
        isRetired: (newAssignment as any).players.is_retired,
        club: (newAssignment as any).players.selected_club ? (typeof (newAssignment as any).players.selected_club === 'string' ? JSON.parse((newAssignment as any).players.selected_club) : (newAssignment as any).players.selected_club) : null
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
  }).catch(handleTenantError);
}

// PUT: Update a player's assignment in an upcoming match
export async function PUT(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
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
          tenant_id: tenantId
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
          slot_number: team === 'Unassigned' ? null : slot_number,
        },
      });

      // Mark match as unbalanced
      await prisma.upcoming_matches.update({
        where: { upcoming_match_id: upcoming_match_id, tenant_id: tenantId },
        data: { is_balanced: false }
      });

      const result = updatedAssignment;

      return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
      console.error('Error updating player assignment:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }).catch(handleTenantError);
}

// DELETE: Remove a player from an upcoming match
export async function DELETE(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
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
            return await handleDeleteWithBody(body, tenantId);
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
        // Multi-tenant: Query scoped to current tenant only
        const activeMatch = await prisma.upcoming_matches.findFirst({
          where: { is_active: true, tenant_id: tenantId },
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
        where: { ...whereClause, tenant_id: tenantId },
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
        where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
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
  }).catch(handleTenantError);
}

// Helper function to handle DELETE with request body
async function handleDeleteWithBody(body: any, tenantId: string) {
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
      where: { is_active: true, tenant_id: tenantId },
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
        upcoming_match_id: targetMatchId,
        tenant_id: tenantId
      }
    });
    
    // Mark match as unbalanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
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
      player_id: player_id,
      tenant_id: tenantId
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
    where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
    data: { is_balanced: false }
  });
  
  return NextResponse.json({ 
    success: true,
    message: 'Player removed from match'
  });
  }).catch(handleTenantError);
} 