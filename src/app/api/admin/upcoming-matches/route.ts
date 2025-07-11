import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerInPool } from '@/lib/transform/player.transform';

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
            player: true
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
              player: true
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
        const { players, ...matchData } = activeMatch;
        formattedMatch = {
          ...matchData,
          players: players.map(p => toPlayerInPool(p))
        };
        return new NextResponse(JSON.stringify({ success: true, data: formattedMatch }), {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
      }
      return new NextResponse(JSON.stringify({ success: true, data: null }), {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    } else if (matchId) {
      // Get specific match
      const match = await prisma.upcoming_matches.findUnique({
        where: { upcoming_match_id: parseInt(matchId) },
        include: {
          players: {
            include: {
              player: true
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
      const { players, ...matchData } = match;
      formattedMatch = {
        ...matchData,
        players: players.map(p => toPlayerInPool(p))
      };

      return NextResponse.json({ success: true, data: formattedMatch }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
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

      return NextResponse.json({ success: true, data: matches }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
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
    const { match_id, upcoming_match_id, state_version, match_date, team_size, is_balanced, is_active } = body;
    
    // Use upcoming_match_id if provided, fallback to match_id for compatibility
    let targetMatchId = upcoming_match_id || match_id;

    if (!targetMatchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    // Ensure the ID is an integer
    targetMatchId = parseInt(targetMatchId, 10);
    if (isNaN(targetMatchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
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

    // Add state_version concurrency check
    if (typeof state_version === 'number' && currentMatch.state_version !== state_version) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
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

    // Update match with state_version increment
    const updatedMatch = await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: {
        match_date: match_date ? new Date(match_date) : undefined,
        team_size: team_size,
        is_balanced: is_balanced !== undefined ? is_balanced : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
        state_version: { increment: 1 }
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

    const upcomingMatchId = parseInt(matchId);
    if (isNaN(upcomingMatchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
    }

    // Get the match to check its state
    const upcomingMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: upcomingMatchId }
    });

    if (!upcomingMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    let shouldTriggerStatsUpdate = false;

    await prisma.$transaction(async (tx) => {
      // If this is a completed match, we need to delete historical data too
      if (upcomingMatch.state === 'Completed') {
        // Find the linked historical match
        const historicalMatch = await tx.matches.findFirst({
          where: { upcoming_match_id: upcomingMatchId }
        });

        if (historicalMatch) {
          // Delete player_matches first (referential integrity)
          await tx.player_matches.deleteMany({
            where: { match_id: historicalMatch.match_id }
          });

          // Delete the historical match
          await tx.matches.delete({
            where: { match_id: historicalMatch.match_id }
          });

          // Flag that we need stats recalculation
          shouldTriggerStatsUpdate = true;
        }
      }

      // Delete player assignments
      await tx.upcoming_match_players.deleteMany({
        where: { upcoming_match_id: upcomingMatchId }
      });

      // Delete player pool data
      await tx.match_player_pool.deleteMany({
        where: { upcoming_match_id: upcomingMatchId }
      });

      // Delete the upcoming match
      await tx.upcoming_matches.delete({
        where: { upcoming_match_id: upcomingMatchId }
      });
    });

    // Trigger stats recalculation if we deleted a completed match (fire and forget)
    if (shouldTriggerStatsUpdate) {
      // Don't await - let stats update run in background
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      fetch(new URL('/api/admin/trigger-stats-update', baseUrl), {
        method: 'POST',
      }).catch(statsError => {
        console.warn('Could not trigger stats recalculation:', statsError);
        // Stats update failure doesn't affect deletion success
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: shouldTriggerStatsUpdate 
        ? 'Match deleted successfully. Stats are being recalculated.'
        : 'Match deleted successfully.'
    });
  } catch (error: any) {
    console.error('Error deleting upcoming match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 