import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { players } from '@prisma/client';
import { splitSizesFromPool, MIN_PLAYERS, MAX_PLAYERS } from '@/utils/teamSplit.util';

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
    
    // Get match details including actual team sizes
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchIdInt },
      select: {
        upcoming_match_id: true,
        team_size: true,
        actual_size_a: true,
        actual_size_b: true,
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

    // Use actual sizes as source of truth if available, otherwise calculate
    let sizeA, sizeB;
    if (match.actual_size_a && match.actual_size_b) {
      sizeA = match.actual_size_a;
      sizeB = match.actual_size_b;
    } else {
      const sizes = splitSizesFromPool(players.length);
      sizeA = sizes.a;
      sizeB = sizes.b;
    }

    // Enhanced validation with proper bounds checking
    const poolSize = players.length;
    if (poolSize < MIN_PLAYERS || poolSize > MAX_PLAYERS) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid player count. Expected ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${poolSize}.` 
        },
        { status: 400 }
      );
    }
    
    if (sizeA + sizeB !== poolSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Size mismatch. Expected ${sizeA}+${sizeB}=${sizeA + sizeB}, got ${poolSize}.` 
        },
        { status: 400 }
      );
    }
    
    // Proper Fisher-Yates shuffle (replace poor 0.5 - Math.random())
    const shuffledPlayers = shuffleArray(players);
    const teamA = shuffledPlayers.slice(0, sizeA);
    const teamB = shuffledPlayers.slice(sizeA, sizeA + sizeB);
    
    // Delete existing slot assignments for this match
    await prisma.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt }
    });
    
    // Create new slot assignments using actual team sizes
    const teamAAssignments = teamA.map((player, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: player.player_id,
      team: 'A',
      slot_number: index + 1 // Slots 1 to sizeA
    }));
    
    // Create new slot assignments for Team B
    const teamBAssignments = teamB.map((player, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: player.player_id,
      team: 'B',
      slot_number: index + 1 // Slots 1 to sizeB
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