import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const upcomingMatchId = searchParams.get('upcoming_match_id');
    
    let targetMatchId;
    
    if (upcomingMatchId) {
      // Use provided upcoming_match_id
      targetMatchId = parseInt(upcomingMatchId);
    } else if (matchId) {
      // Use provided matchId for backward compatibility
      targetMatchId = parseInt(matchId);
    } else {
      // Find the active match if no match ID is provided
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

    // Delete all player assignments for this match
    await prisma.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: targetMatchId }
    });

    // Set is_balanced to false for the match
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: { is_balanced: false }
    });

    return NextResponse.json({ 
      success: true,
      message: 'All players cleared from match'
    });
  } catch (error: any) {
    console.error('Error clearing match players:', error);
    return NextResponse.json(
      { success: false, error: `Failed to clear match players: ${error.message}` },
      { status: 500 }
    );
  }
} 