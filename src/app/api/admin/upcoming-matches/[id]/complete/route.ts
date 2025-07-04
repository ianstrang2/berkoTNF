import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API route to complete a match.
 * Accepts final score and player stats, creates the historical match record,
 * and transitions the upcoming_match state to 'Completed'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = parseInt(params.id, 10);
    const { state_version, score, player_stats } = await request.json();

    if (isNaN(matchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
    }
    if (typeof state_version !== 'number') {
      return NextResponse.json({ success: false, error: 'state_version is required' }, { status: 400 });
    }
    if (!score || typeof score.team_a !== 'number' || typeof score.team_b !== 'number') {
      return NextResponse.json({ success: false, error: 'Valid score object is required' }, { status: 400 });
    }
    if (!Array.isArray(player_stats)) {
      return NextResponse.json({ success: false, error: 'player_stats must be an array' }, { status: 400 });
    }

    const completedMatch = await prisma.$transaction(async (tx) => {
      // 1. Fetch and validate the upcoming match
      const upcomingMatch = await tx.upcoming_matches.findUnique({
        where: { upcoming_match_id: matchId },
        include: { players: true },
      });

      if (!upcomingMatch) {
        throw new Error('Match not found');
      }
      if ((upcomingMatch as any).state !== 'TeamsBalanced') {
        throw new Error(`Cannot complete match with state ${(upcomingMatch as any).state}.`);
      }
      if ((upcomingMatch as any).state_version !== state_version) {
        throw new Error('Conflict: Match has been updated by someone else.');
      }

      // 2. Create the historical match record
      const newMatch = await tx.matches.create({
        data: {
          match_date: upcomingMatch.match_date,
          team_a_score: score.team_a,
          team_b_score: score.team_b,
          upcoming_match_id: matchId,
        } as any,
      });

      // 3. Create player_matches records with calculated result fields
      const goalsMap = new Map(player_stats.map((p: { player_id: number; goals: number }) => [p.player_id, p.goals]));
      
      // Calculate match result metrics
      const scoreDiff = Math.abs(score.team_a - score.team_b);
      const isHeavyWin = scoreDiff >= 4;
      
      const playerMatchesData = upcomingMatch.players
        .filter(p => p.team === 'A' || p.team === 'B') // Ensure only assigned players are included
        .map(p => {
          // Determine team score and opposing score
          const teamScore = p.team === 'A' ? score.team_a : score.team_b;
          const opposingScore = p.team === 'A' ? score.team_b : score.team_a;
          
          // Calculate result
          const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');
          
          // Calculate result-specific flags
          const heavy_win = result === 'win' && isHeavyWin;
          const heavy_loss = result === 'loss' && isHeavyWin;
          const clean_sheet = opposingScore === 0;
          
          return {
            match_id: newMatch.match_id,
            player_id: p.player_id,
            team: p.team,
            goals: goalsMap.get(p.player_id) || 0,
            result,
            heavy_win,
            heavy_loss,
            clean_sheet,
          };
        });

      if (playerMatchesData.length > 0) {
        await tx.player_matches.createMany({
          data: playerMatchesData as any, // Prisma expects a more specific type here, but our data is valid
        });
      }

      // 4. Update the upcoming_match state (remove strict concurrency check for completion)
      const updatedUpcomingMatch = await tx.upcoming_matches.update({
        where: {
          upcoming_match_id: matchId,
        } as any,
        data: {
          state: 'Completed',
          state_version: { increment: 1 },
          is_completed: true,
          is_active: false,
        } as any,
      });

      return updatedUpcomingMatch;
    });

    return NextResponse.json({ success: true, data: completedMatch });
  } catch (error: any) {
    console.error('ERROR COMPLETING MATCH:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      meta: error.meta
    });
    
    if (error.message.includes('Conflict')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    if (error.message.includes('not found')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `Match completion failed: ${error.message}` 
    }, { status: 500 });
  }
} 