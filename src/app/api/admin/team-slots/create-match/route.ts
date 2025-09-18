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
          season_id: null,
        },
      });

      // Create player_matches entries
      // Filter players to ensure player_id is not null for TypeScript
      const validPlayerMatchData = players
        .filter(player => player.player_id !== null) // This will satisfy TypeScript
        .map(player => {
          let clean_sheet = false;
          let heavy_win = false;
          let heavy_loss = false;
          let result = 'draw';

          if (player.team === 'A') {
            clean_sheet = team_b_score === 0;
            heavy_win = team_a_score > team_b_score && (team_a_score - team_b_score) >= 4;
            heavy_loss = team_b_score > team_a_score && (team_b_score - team_a_score) >= 4;
            if (team_a_score > team_b_score) result = 'win';
            if (team_a_score < team_b_score) result = 'loss';
          } else if (player.team === 'B') {
            clean_sheet = team_a_score === 0;
            heavy_win = team_b_score > team_a_score && (team_b_score - team_a_score) >= 4;
            heavy_loss = team_a_score > team_b_score && (team_a_score - team_b_score) >= 4;
            if (team_b_score > team_a_score) result = 'win';
            if (team_b_score < team_a_score) result = 'loss';
          }

          return {
            match_id: newMatch.match_id,
            player_id: player.player_id as number, // Asserting here since we filtered
            team: player.team,
            goals: player.goals, // player.goals is 0 from the 'players' array mapping
            clean_sheet,
            heavy_win,
            heavy_loss,
            result,
          };
        })
        // Final filter to exclude players who were not on team A or B
        .filter(data => data.team === 'A' || data.team === 'B');

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