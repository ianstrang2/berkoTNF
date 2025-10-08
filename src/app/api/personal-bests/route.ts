import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { PersonalBestsAPIResponseData } from '@/types/personal-bests.types';
// Multi-tenant imports - ensuring personal bests are tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// Note: Removed unstable_cache to prevent cross-tenant data leaks
async function getPersonalBestsData(tenantId: string): Promise<PersonalBestsAPIResponseData | null> {
  console.log(`Fetching fresh personal bests data from DB for tenant ${tenantId}`);
    
    // Multi-tenant: Use tenant-scoped query for personal bests
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const latestPb = await prisma.aggregated_personal_bests.findFirst({
      where: { tenant_id: tenantId },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        matches: { // Join with matches table
          select: {
            match_date: true,
          },
        },
      },
    });

    if (!latestPb) {
      return null;
    }

    // Restore the correct data structure expected by the frontend
    const responseData: PersonalBestsAPIResponseData = {
      match_id: latestPb.match_id,
      match_date: (latestPb as any).matches.match_date,
      broken_pbs_data: latestPb.broken_pbs_data as unknown as PersonalBestsAPIResponseData['broken_pbs_data'],
    };

    return responseData;
  }

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    const data = await getPersonalBestsData(tenantId);
    // Return success: true for consistency with how other components might handle this
    return NextResponse.json({ success: true, data }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 