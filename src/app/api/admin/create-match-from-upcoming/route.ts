import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Create a real match from an upcoming match
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.upcoming_match_id) {
      return NextResponse.json({ error: 'Upcoming match ID is required' }, { status: 400 });
    }

    // Get upcoming match details
    const upcomingMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: body.upcoming_match_id },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    });

    if (!upcomingMatch) {
      return NextResponse.json({ error: 'Upcoming match not found' }, { status: 404 });
    }

    // Check if we have players assigned
    if (upcomingMatch.players.length === 0) {
      return NextResponse.json({ error: 'No players assigned to this match' }, { status: 400 });
    }

    // Create a new match record
    const newMatch = await prisma.matches.create({
      data: {
        match_date: upcomingMatch.match_date,
        team_a_score: 0,
        team_b_score: 0
      }
    });

    // Create player_matches records for each player in the upcoming match
    const playerMatches = await Promise.all(
      upcomingMatch.players.map(async (player) => {
        // Default to draw until real result is entered
        const result = 'draw';
        
        return prisma.player_matches.create({
          data: {
            match_id: newMatch.match_id,
            player_id: player.player_id,
            team: player.team,
            goals: 0,
            result: result,
            heavy_win: false,
            heavy_loss: false
          }
        });
      })
    );

    // Delete the upcoming match
    await prisma.upcoming_matches.delete({
      where: { upcoming_match_id: body.upcoming_match_id }
    });

    return NextResponse.json({
      success: true,
      data: {
        match: newMatch,
        playerCount: playerMatches.length
      }
    });
  } catch (error) {
    console.error('Error creating match from upcoming match:', error);
    return NextResponse.json({ error: 'Failed to create match from upcoming match' }, { status: 500 });
  }
} 