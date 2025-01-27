import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

// Add caching headers to prevent multiple requests
export const dynamic = 'force-dynamic'; // defaults to force-static
export const revalidate = 30; // revalidate the data at most every 30 seconds

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
    });

    // Add cache control headers
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=59');
    
    return response;
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}