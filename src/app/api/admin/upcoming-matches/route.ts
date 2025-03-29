import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch upcoming matches
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const active = searchParams.get('active');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let formattedMatch;

    // Define query structure with TypeScript support
    const matchQuery: any = {
      include: {
        players: {
          include: {
            player: {
              select: {
                name: true,
                goalscoring: true,
                stamina_pace: true,
                control: true,
                teamwork: true,
                resilience: true
              }
            }
          },
          orderBy: [
            { slot_number: 'asc' },
            { created_at: 'asc' }
          ]
        }
      }
    };

    if (active === 'true') {
      // Get active match
      console.log('Fetching active match...');
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true },
        include: {
          players: {
            include: {
              player: {
                select: {
                  name: true,
                  goalscoring: true,
                  stamina_pace: true,
                  control: true,
                  teamwork: true,
                  resilience: true
                }
              }
            },
            orderBy: [
              { slot_number: 'asc' },
              { created_at: 'asc' }
            ]
          }
        }
      });

      console.log('Active match result:', JSON.stringify(activeMatch, null, 2));

      if (activeMatch) {
        // Format the response
        formattedMatch = {
          ...activeMatch,
          players: activeMatch.players.map(p => ({
            player_id: p.player_id,
            match_id: p.upcoming_match_id,
            upcoming_match_id: p.upcoming_match_id,
            player_match_id: p.upcoming_player_id,
            team: p.team,
            position: p.position,
            slot_number: p.slot_number,
            ...p.player
          }))
        };
        return NextResponse.json({ success: true, data: formattedMatch });
      }
      return NextResponse.json({ success: true, data: null });
    } else if (matchId) {
      // Get specific match
      const match = await prisma.upcoming_matches.findUnique({
        where: { upcoming_match_id: parseInt(matchId) },
        include: {
          players: {
            include: {
              player: {
                select: {
                  name: true,
                  goalscoring: true,
                  stamina_pace: true,
                  control: true,
                  teamwork: true,
                  resilience: true
                }
              }
            },
            orderBy: [
              { slot_number: 'asc' },
              { created_at: 'asc' }
            ]
          }
        }
      });

      if (!match) {
        return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
      }

      // Format the response
      formattedMatch = {
        ...match,
        players: match.players.map(p => ({
          player_id: p.player_id,
          match_id: p.upcoming_match_id,
          upcoming_match_id: p.upcoming_match_id,
          player_match_id: p.upcoming_player_id,
          team: p.team,
          position: p.position,
          slot_number: p.slot_number,
          ...p.player
        }))
      };

      return NextResponse.json({ success: true, data: formattedMatch });
    } else {
      // Fetch all upcoming matches
      const matches = await prisma.upcoming_matches.findMany({
        orderBy: {
          match_date: 'asc'
        },
        include: {
          _count: {
            select: { players: true }
          }
        }
      });

      return NextResponse.json({ success: true, data: matches });
    }
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}

// POST: Create a new upcoming match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_date, team_size } = body;

    if (!match_date) {
      return NextResponse.json({ success: false, error: 'Match date is required' }, { status: 400 });
    }

    if (!team_size || team_size < 5 || team_size > 11) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team size is required and must be between 5 and 11' 
      }, { status: 400 });
    }

    // If creating a new active match, deactivate any existing active matches
    if (body.is_active === true) {
      await prisma.upcoming_matches.updateMany({
        where: { is_active: true },
        data: { is_active: false }
      });
    }

    // Create new match
    const newMatch = await prisma.upcoming_matches.create({
      data: {
        match_date: new Date(match_date),
        team_size: team_size,
        is_balanced: false,
        is_active: body.is_active !== undefined ? body.is_active : true // Default to active if not specified
      }
    });

    return NextResponse.json({ success: true, data: newMatch });
  } catch (error: any) {
    console.error('Error creating upcoming match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing upcoming match
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, upcoming_match_id, match_date, team_size, is_balanced, is_active } = body;
    
    // Use upcoming_match_id if provided, fallback to match_id for compatibility
    const targetMatchId = upcoming_match_id || match_id;

    if (!targetMatchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    // Get current match to check current team size
    const currentMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: targetMatchId },
      include: { 
        _count: { select: { players: true } } 
      }
    });

    if (!currentMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Check if team size is being reduced and there are more players than the new size would allow
    if (team_size && team_size < currentMatch.team_size && currentMatch._count.players > team_size * 2) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot reduce team size: ${currentMatch._count.players} players are assigned but new team size would only allow ${team_size * 2} players.`
      }, { status: 400 });
    }

    // If setting match as active, deactivate any other active matches
    if (is_active === true && !currentMatch.is_active) {
      await prisma.upcoming_matches.updateMany({
        where: { 
          is_active: true,
          upcoming_match_id: { not: targetMatchId }
        },
        data: { is_active: false }
      });
    }

    // Update match
    const updatedMatch = await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: {
        match_date: match_date ? new Date(match_date) : undefined,
        team_size: team_size,
        is_balanced: is_balanced !== undefined ? is_balanced : undefined,
        is_active: is_active !== undefined ? is_active : undefined
      }
    });

    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
    console.error('Error updating upcoming match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an upcoming match
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('id');

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    // Delete player assignments first
    await prisma.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: parseInt(matchId) }
    });

    // Delete the match
    await prisma.upcoming_matches.delete({
      where: { upcoming_match_id: parseInt(matchId) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting upcoming match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 