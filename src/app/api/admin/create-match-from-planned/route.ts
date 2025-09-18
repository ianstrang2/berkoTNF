import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Create a real match from a planned match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept either field name for compatibility
    const { match_id, upcoming_match_id } = body;
    
    // Use upcoming_match_id if provided, fallback to match_id
    let targetMatchId = upcoming_match_id || match_id;
    
    // If no match ID provided, use the active match
    if (!targetMatchId) {
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
    }

    // Fetch match details
    const plannedMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: targetMatchId },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    });

    if (!plannedMatch) {
      return NextResponse.json({ 
        success: false, 
        error: 'Planned match not found' 
      }, { status: 404 });
    }

    // Check if match is balanced
    if (!plannedMatch.is_balanced) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match must be balanced before creating a match report' 
      }, { status: 400 });
    }

    // Check if there are player assignments
    if (!plannedMatch.players || plannedMatch.players.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No player assignments found for this match' 
      }, { status: 400 });
    }

    // Create match record
    const newMatch = await prisma.matches.create({
      data: {
        match_date: plannedMatch.match_date,
        team_a_score: 0,
        team_b_score: 0,
        season_id: null
      }
    });

    // Create player match records
    const playerPromises = plannedMatch.players.map(player => {
      const teamName = player.team || 'A'; // Default to team A if not assigned
      
      return prisma.player_matches.create({
        data: {
          match_id: newMatch.match_id,
          player_id: player.player_id,
          team: teamName,
          goals: 0,
          clean_sheet: true, // Both teams have 0 goals
          heavy_win: false,
          heavy_loss: false,
          result: 'draw' // Initial result is a draw since scores are 0-0
        }
      });
    });
    
    await Promise.all(playerPromises);
    
    return NextResponse.json({
      success: true,
      data: {
        match_id: newMatch.match_id,
        player_count: plannedMatch.players.length
      },
      message: 'Match created successfully'
    });
  } catch (error: any) {
    console.error('Error creating match from planned match:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create match from planned match'
    }, { status: 500 });
  }
} 