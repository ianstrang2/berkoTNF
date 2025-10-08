import { NextRequest, NextResponse } from 'next/server';
import { handleTenantError } from '@/lib/api-helpers';
import { getTenantFromRequest } from '@/lib/tenantContext';
import { prisma } from '@/lib/prisma'; // Assuming prisma client is at @/lib/prisma

// Ensure this route is revalidated on every request
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Multi-tenant: Get tenant context for scoped queries
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const latestStatus = await prisma.aggregated_match_report.findFirst({
      where: {
        tenant_id: tenantId
      },
      orderBy: {
        // Assuming 'match_date' or a similar timestamp column exists to determine the latest record.
        // If your table uses an auto-incrementing ID as primary key for ordering, you might use:
        // id: 'desc'
        match_date: 'desc',
      },
      select: {
        on_fire_player_id: true,
        grim_reaper_player_id: true,
        match_date: true, // Included for verification, can be removed
      },
    });

    if (!latestStatus) {
      // Return default null values if no records are found
      return NextResponse.json({
        on_fire_player_id: null,
        grim_reaper_player_id: null,
      }, {
        headers: {
          'Cache-Control': 'private, max-age=300',
          'Vary': 'Cookie'
        }
      });
    }

    return NextResponse.json({
      on_fire_player_id: latestStatus.on_fire_player_id ? String(latestStatus.on_fire_player_id) : null,
      grim_reaper_player_id: latestStatus.grim_reaper_player_id ? String(latestStatus.grim_reaper_player_id) : null,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
} 