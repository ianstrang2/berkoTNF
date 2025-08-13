import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerInPool } from '@/lib/transform/player.transform';

// GET: Fetch upcoming matches for public view
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');

    if (matchId) {
      // Get specific match with full details for expansion
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
      const formattedMatch = {
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
      // Fetch upcoming matches (non-completed, >= today's date)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      const matches = await prisma.upcoming_matches.findMany({
        where: {
          state: {
            not: 'Completed'
          },
          match_date: {
            gte: today
          }
        },
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
    console.error('Error fetching upcoming matches:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
