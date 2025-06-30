import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';

export async function GET(request: NextRequest) {
  try {
    const playersFromDb = await prisma.players.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    const transformedPlayers = playersFromDb.map(toPlayerProfile);

    return NextResponse.json({
      data: transformedPlayers
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60'
      }
    });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}