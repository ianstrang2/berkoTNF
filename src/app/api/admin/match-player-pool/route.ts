import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch player pool for a match
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('match_id');
    const activeOnly = searchParams.get('active') === 'true';

    let whereClause: any = {};
    
    if (matchId) {
      // Get player pool for a specific match
      whereClause.upcoming_match_id = parseInt(matchId);
    } else if (activeOnly) {
      // Get player pool for the active match
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
        error: 'Either match_id or active=true is required' 
      }, { status: 400 });
    }

    // Get player pool with player details
    const playerPool = await prisma.match_player_pool.findMany({
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
            is_retired: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    // Format the response
    const formattedPlayers = playerPool.map(entry => ({
      id: entry.player_id.toString(),
      pool_id: entry.id,
      match_id: entry.upcoming_match_id,
      response_status: entry.response_status,
      response_timestamp: entry.response_timestamp,
      notification_sent: entry.notification_sent,
      notification_timestamp: entry.notification_timestamp,
      notes: entry.notes,
      name: entry.player.name,
      goalscoring: entry.player.goalscoring,
      defending: entry.player.defender,
      stamina_pace: entry.player.stamina_pace,
      control: entry.player.control,
      teamwork: entry.player.teamwork,
      resilience: entry.player.resilience,
      is_ringer: entry.player.is_ringer,
      is_retired: entry.player.is_retired
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedPlayers 
    });
  } catch (error: any) {
    console.error('Error fetching player pool:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST: Add a player to the pool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { match_id, player_id, response_status = 'IN', notes } = body;

    // Validate required fields
    if (!match_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match ID is required' 
      }, { status: 400 });
    }

    if (!player_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    // Convert IDs to integers
    match_id = parseInt(match_id, 10);
    player_id = parseInt(player_id, 10);

    // Check if this player is already in the pool for this match
    const existingEntry = await prisma.match_player_pool.findFirst({
      where: {
        upcoming_match_id: match_id,
        player_id: player_id
      }
    });

    if (existingEntry) {
      // Update existing entry instead of creating a new one
      const updatedEntry = await prisma.match_player_pool.update({
        where: { id: existingEntry.id },
        data: { 
          response_status, 
          notes,
          response_timestamp: new Date(),
          updated_at: new Date()
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
              is_retired: true
            }
          }
        }
      });

      // Format response
      const formattedPlayer = {
        id: updatedEntry.player_id.toString(),
        pool_id: updatedEntry.id,
        match_id: updatedEntry.upcoming_match_id,
        response_status: updatedEntry.response_status,
        response_timestamp: updatedEntry.response_timestamp,
        name: updatedEntry.player.name,
        goalscoring: updatedEntry.player.goalscoring,
        defending: updatedEntry.player.defender,
        stamina_pace: updatedEntry.player.stamina_pace,
        control: updatedEntry.player.control,
        teamwork: updatedEntry.player.teamwork,
        resilience: updatedEntry.player.resilience,
        is_ringer: updatedEntry.player.is_ringer,
        is_retired: updatedEntry.player.is_retired
      };

      return NextResponse.json({ 
        success: true, 
        data: formattedPlayer,
        updated: true
      });
    }

    // Create new player pool entry
    const newEntry = await prisma.match_player_pool.create({
      data: {
        response_status,
        notes,
        player: {
          connect: { player_id }
        },
        match: {
          connect: { upcoming_match_id: match_id }
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
            is_retired: true
          }
        }
      }
    });

    // Format response
    const formattedPlayer = {
      id: newEntry.player_id.toString(),
      pool_id: newEntry.id,
      match_id: newEntry.upcoming_match_id,
      response_status: newEntry.response_status,
      response_timestamp: newEntry.response_timestamp,
      name: newEntry.player.name,
      goalscoring: newEntry.player.goalscoring,
      defending: newEntry.player.defender,
      stamina_pace: newEntry.player.stamina_pace,
      control: newEntry.player.control,
      teamwork: newEntry.player.teamwork,
      resilience: newEntry.player.resilience,
      is_ringer: newEntry.player.is_ringer,
      is_retired: newEntry.player.is_retired
    };

    return NextResponse.json({ 
      success: true, 
      data: formattedPlayer 
    });
  } catch (error: any) {
    console.error('Error adding player to pool:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE: Remove a player from the pool
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('match_id');
    const playerId = searchParams.get('player_id');
    const poolId = searchParams.get('pool_id');
    
    // If no params provided, check request body
    if (!matchId && !playerId && !poolId) {
      try {
        const body = await request.json();
        if (body) {
          return await handleDeleteWithBody(body);
        }
      } catch (parseError) {
        // If parsing fails, likely not a JSON body
        console.log('No JSON body in DELETE request, using query params');
      }
    }
    
    // We need to have a way to identify the entry
    if (!poolId && (!matchId || !playerId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either pool_id or both match_id and player_id are required' 
      }, { status: 400 });
    }
    
    // Build the where clause based on available parameters
    let whereClause: any = {};
    
    if (poolId) {
      whereClause.id = parseInt(poolId);
    } else {
      whereClause.upcoming_match_id = parseInt(matchId!);
      whereClause.player_id = parseInt(playerId!);
    }
    
    // Delete the player from the pool
    const deleteResult = await prisma.match_player_pool.deleteMany({
      where: whereClause
    });
    
    if (deleteResult.count === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player not found in pool' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Player removed from pool',
      count: deleteResult.count
    });
  } catch (error: any) {
    console.error('Error removing player from pool:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Helper function to handle DELETE with request body
async function handleDeleteWithBody(body: any) {
  let { match_id, player_id, pool_id } = body;
  
  // We need to have a way to identify the entry
  if (!pool_id && (!match_id || !player_id)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Either pool_id or both match_id and player_id are required' 
    }, { status: 400 });
  }
  
  // Convert numeric parameters to integers
  if (pool_id) pool_id = parseInt(pool_id, 10);
  if (match_id) match_id = parseInt(match_id, 10);
  if (player_id) player_id = parseInt(player_id, 10);
  
  // Build the where clause based on available parameters
  let whereClause: any = {};
  
  if (pool_id) {
    whereClause.id = pool_id;
  } else {
    whereClause.upcoming_match_id = match_id;
    whereClause.player_id = player_id;
  }
  
  // Delete the player from the pool
  const deleteResult = await prisma.match_player_pool.deleteMany({
    where: whereClause
  });
  
  if (deleteResult.count === 0) {
    return NextResponse.json({ 
      success: false, 
      error: 'Player not found in pool' 
    }, { status: 404 });
  }
  
  return NextResponse.json({ 
    success: true,
    message: 'Player removed from pool',
    count: deleteResult.count
  });
} 