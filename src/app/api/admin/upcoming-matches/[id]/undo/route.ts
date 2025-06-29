import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const upcomingMatchId = parseInt(params.id, 10);
    const { state_version } = await request.json();

    if (isNaN(upcomingMatchId) || typeof state_version !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const upcomingMatch = await tx.upcoming_matches.findUnique({
        where: { upcoming_match_id: upcomingMatchId },
      });

      if (!upcomingMatch) throw new Error('Match not found');
      if ((upcomingMatch as any).state !== 'Completed') throw new Error(`Cannot undo a match with state ${(upcomingMatch as any).state}.`);
      if ((upcomingMatch as any).state_version !== state_version) throw new Error('Conflict');

      const historicalMatch = await tx.matches.findFirst({
        where: { upcoming_match_id: upcomingMatchId } as any,
      });

      if (historicalMatch) {
        await tx.player_matches.deleteMany({
          where: { match_id: historicalMatch.match_id },
        });
        await tx.matches.delete({
          where: { match_id: historicalMatch.match_id },
        });
      }

      return await tx.upcoming_matches.update({
        where: {
          upcoming_match_id: upcomingMatchId,
          state_version: state_version,
        } as any,
        data: {
          state: 'TeamsBalanced',
          is_completed: false,
          state_version: { increment: 1 },
        } as any,
      });
    });

    return NextResponse.json({ success: true, state_version: (result as any).state_version });

  } catch (error: any) {
    if (error.message === 'Conflict') {
      return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
    }
    if (error.message.includes('not found')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 