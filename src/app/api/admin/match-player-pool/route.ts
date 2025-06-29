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

// POST: Add a player to the match pool
export async function POST(request: NextRequest) {
  try {
    const { match_id, player_id } = await request.json();
    if (!match_id || !player_id) {
      return NextResponse.json({ success: false, error: 'Match ID and Player ID are required' }, { status: 400 });
    }

    const newPlayer = await prisma.upcoming_match_players.create({
      data: {
        upcoming_match_id: parseInt(match_id),
        player_id: parseInt(player_id),
        team: 'Unassigned',
      },
    });

    return NextResponse.json({ success: true, data: newPlayer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to add player to pool' }, { status: 500 });
  }
}

// DELETE: Remove a player from the match pool
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('match_id');
    const playerId = searchParams.get('player_id');

    if (!matchId || !playerId) {
      return NextResponse.json({ success: false, error: 'Match ID and Player ID are required' }, { status: 400 });
    }

    await prisma.upcoming_match_players.deleteMany({
      where: {
        upcoming_match_id: parseInt(matchId),
        player_id: parseInt(playerId),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to remove player from pool' }, { status: 500 });
  }
}

// Helper function to handle DELETE with request body - REMOVED as logic is consolidated
// async function handleDeleteWithBody(body: any) { ... } 