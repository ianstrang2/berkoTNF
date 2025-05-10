import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { match_date, team_a_score, team_b_score } = await request.json();

    // Get current slot assignments
    const slots = await prisma.team_slots.findMany({
      where: {
        player_id: {
          not: null
        }
      },
      orderBy: {
        slot_number: 'asc'
      },
      include: {
        player: true
      }
    });

    // Convert slots to player_matches format
    const players = slots.map(slot => ({
      player_id: slot.player_id,
      team: slot.slot_number <= 9 ? 'A' : 'B',
      goals: 0 // Initial goals set to 0
    }));

    // Create match using existing match creation logic
    const match = await prisma.$transaction(async (prisma) => {
      const newMatch = await prisma.matches.create({
        data: {
          match_date: new Date(match_date),
          team_a_score,
          team_b_score,
        },
      });

      // Create player_matches entries
      // Filter players to ensure player_id is not null for TypeScript
      const validPlayerMatchData = players
        .filter(player => player.player_id !== null) // This will satisfy TypeScript
        .map(player => ({
          match_id: newMatch.match_id,
          player_id: player.player_id as number, // Asserting here since we filtered
          team: player.team,
          goals: player.goals, // player.goals is 0 from the 'players' array mapping
          clean_sheet: player.team === 'A' ? team_b_score === 0 : team_a_score === 0,
          heavy_win: player.team === 'A' 
            ? team_a_score > team_b_score && (team_a_score - team_b_score) >= 4
            : team_b_score > team_a_score && (team_b_score - team_a_score) >= 4,
          heavy_loss: player.team === 'A'
            ? team_b_score > team_a_score && (team_b_score - team_a_score) >= 4
            : team_a_score > team_b_score && (team_a_score - team_b_score) >= 4,
          result: player.team === 'A'
            ? team_a_score > team_b_score ? 'win' : (team_a_score < team_b_score ? 'loss' : 'draw')
            : team_b_score > team_a_score ? 'win' : (team_b_score < team_a_score ? 'loss' : 'draw')
        }));

      if (validPlayerMatchData.length > 0) { // Only call createMany if there's valid data
        await prisma.player_matches.createMany({
          data: validPlayerMatchData,
        });
      }

      return newMatch;
    });

    return NextResponse.json({ 
      success: true,
      data: match 
    });
  } catch (error) {
    console.error('Error creating match from slots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create match' },
      { status: 500 }
    );
  }
} 