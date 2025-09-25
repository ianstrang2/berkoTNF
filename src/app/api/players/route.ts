import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
// Multi-tenant imports - ensuring public routes are tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

const getPlayersData = unstable_cache(
  async () => {
    console.log('Fetching fresh players data from DB.');
    
    // Multi-tenant: Use tenant-scoped query for public player data
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const playersFromDb = await prisma.players.findMany({
      where: { tenant_id: tenantId },
      orderBy: {
        name: 'asc'
      }
    });

    const transformedPlayers = playersFromDb.map(toPlayerProfile);
    return transformedPlayers;
  },
  ['players_data'],
  {
    tags: [CACHE_TAGS.PLAYER_PROFILE],
    revalidate: 3600, // 1 hour cache
  }
);

export async function GET(request: NextRequest) {
  try {
    const transformedPlayers = await getPlayersData();

    return NextResponse.json({
      data: transformedPlayers
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600'
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