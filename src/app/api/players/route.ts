import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
// Multi-tenant imports - ensuring public routes are tenant-scoped
import { getTenantFromRequest, getCurrentTenantId } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// Note: unstable_cache with dynamic keys (tenantId) doesn't work well
// We'll fetch directly for now to ensure proper tenant isolation
async function getPlayersDataForTenant(tenantId: string) {
  console.log(`Fetching fresh players data from DB for tenant ${tenantId}`);
  
  // Multi-tenant: Use tenant-scoped query for public player data
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  const playersFromDb = await prisma.players.findMany({
    where: { tenant_id: tenantId },
    orderBy: {
      name: 'asc'
    }
  });

  const transformedPlayers = playersFromDb.map(toPlayerProfile);
  return transformedPlayers;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    const transformedPlayers = await getPlayersDataForTenant(tenantId);

    return NextResponse.json({
      data: transformedPlayers
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Private cache, 5 min (tenant-specific)
        'Vary': 'Cookie', // Cache varies by session cookie
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
}