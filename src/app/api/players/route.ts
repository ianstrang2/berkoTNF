import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'players-list';
    
    // Try to get from cache first
    const cached = await prisma.$queryRaw`
      SELECT DISTINCT 
        players.player_id as id,
        players.name
      FROM players
      ORDER BY name ASC
    `;

    const response = NextResponse.json({ 
      data: serializeData(cached)
    },
    {
      headers: {
        'Cache-Control': 'max-age=60, must-revalidate'
      }
    });

    // Add cache control headers
    // response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59');
    
    return response;
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}