import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { players } from '@prisma/client';

// Define interface for player pool entries
interface PoolPlayer {
  id: number;
  player_id: number;
  upcoming_match_id: number;
  response_status: string;
  player: {
    name: string;
  };
}

// Shuffle array function for random ordering
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// POST: Randomly balance teams
export async function POST(request: NextRequest) {
  try {
    // Get matchId from URL query parameters
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }
    
    const matchIdInt = parseInt(matchId, 10);
    if (isNaN(matchIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid match ID' },
        { status: 400 }
      );
    }
    
    // Get match details
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchIdInt },
      select: {
        upcoming_match_id: true,
        team_size: true,
        is_balanced: true
      }
    });
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }
    
    // Correctly fetch only the players assigned to this upcoming match
    const playersInPool = await prisma.upcoming_match_players.findMany({
      where: {
        upcoming_match_id: matchIdInt,
      },
      include: {
        player: true
      },
    });

    const players = playersInPool.map(p => p.player).filter(p => p !== null) as players[];

    if (players.length < match.team_size * 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Not enough players in pool. Need ${match.team_size * 2}, have ${players.length}.` 
        },
        { status: 400 }
      );
    }
    
    const shuffledPlayers = players.sort(() => 0.5 - Math.random());
    const teamSize = match.team_size;
    const teamA = shuffledPlayers.slice(0, teamSize);
    const teamB = shuffledPlayers.slice(teamSize, teamSize * 2);
    
    // Delete existing slot assignments for this match
    await prisma.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt }
    });
    
    // Create new slot assignments for Team A
    const teamAAssignments = teamA.map((player, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: player.player_id,
      team: 'A',
      slot_number: index + 1 // Slots 1 to teamSize
    }));
    
    // Create new slot assignments for Team B
    const teamBAssignments = teamB.map((player, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: player.player_id,
      team: 'B',
      slot_number: teamSize + index + 1 // Slots teamSize+1 to teamSize*2
    }));
    
    // Combine assignments and insert them
    const allAssignments = [...teamAAssignments, ...teamBAssignments];
    await prisma.upcoming_match_players.createMany({
      data: allAssignments
    });
    
    // Mark match as balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: matchIdInt },
      data: { is_balanced: true }
    });
    
    // Get the complete data with player details for response
    const updatedAssignments = await prisma.upcoming_match_players.findMany({
      where: { upcoming_match_id: matchIdInt },
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
      orderBy: { slot_number: 'asc' }
    });
    
    // Format the slots in the response
    const formattedSlots = updatedAssignments.map(assignment => ({
      slot_number: assignment.slot_number,
      player_id: assignment.player_id.toString(),
      team: assignment.team,
      name: assignment.player.name,
      goalscoring: assignment.player.goalscoring,
      defending: assignment.player.defender,
      stamina_pace: assignment.player.stamina_pace,
      control: assignment.player.control,
      teamwork: assignment.player.teamwork,
      resilience: assignment.player.resilience
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        is_balanced: true,
        slots: formattedSlots,
        stats: {
          balanceType: 'random',
          balanceQuality: 'Random',
          message: 'Teams were balanced randomly'
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error randomly balancing teams:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 