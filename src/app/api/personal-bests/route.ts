import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { PersonalBestsAPIResponseData } from '@/types/personal-bests.types';
// Multi-tenant imports - ensuring personal bests are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';

// Note: Removed unstable_cache to prevent cross-tenant data leaks
async function getPersonalBestsData(tenantId: string): Promise<PersonalBestsAPIResponseData | null> {
  console.log(`Fetching fresh personal bests data from DB for tenant ${tenantId}`);
    
    // RLS disabled on aggregated tables - using explicit tenant filter
    const latestPb = await prisma.aggregated_personal_bests.findFirst({
      where: withTenantFilter(tenantId),
      orderBy: {
        created_at: 'desc',
      },
      // NOTE: Don't use include with RLS-enabled tables due to connection pooling
      // The include might use a different connection without RLS context set
    });

    if (!latestPb) {
      return null;
    }

    // Fetch match separately to ensure RLS context is properly set
    // matches table has RLS enabled, so we need explicit filtering + middleware RLS
    const match = await prisma.matches.findUnique({
      where: { 
        match_id: latestPb.match_id,
        tenant_id: tenantId // Explicit filter for defense-in-depth
      },
      select: {
        match_date: true,
      },
    });

    if (!match) {
      console.warn(`[PERSONAL_BESTS] Match ${latestPb.match_id} not found for tenant ${tenantId}`);
      return null;
    }

    // Restore the correct data structure expected by the frontend
    const responseData: PersonalBestsAPIResponseData = {
      match_id: latestPb.match_id,
      match_date: match.match_date,
      broken_pbs_data: latestPb.broken_pbs_data as unknown as PersonalBestsAPIResponseData['broken_pbs_data'],
    };

    return responseData;
  }

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await getPersonalBestsData(tenantId);
    // Return success: true for consistency with how other components might handle this
    return NextResponse.json({ success: true, data }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError);
} 