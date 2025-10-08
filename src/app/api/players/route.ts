import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// Phase 2: Helper function no longer needs manual RLS setup
async function getPlayersDataForTenant(tenantId: string) {
  console.log(`Fetching fresh players data from DB for tenant ${tenantId}`);
  
  // Phase 2: Middleware automatically sets RLS context
  const playersFromDb = await prisma.players.findMany({
    where: { tenant_id: tenantId }, // Still required for defense-in-depth!
    orderBy: {
      name: 'asc'
    }
  });

  return playersFromDb.map(toPlayerProfile);
}

// Phase 2: Use withTenantContext wrapper
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const transformedPlayers = await getPlayersDataForTenant(tenantId);

    return NextResponse.json({
      data: transformedPlayers
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie',
      }
    });
  }).catch(handleTenantError);
}