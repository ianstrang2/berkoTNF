import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { PersonalBestsAPIResponseData } from '@/types/personal-bests.types';
// Multi-tenant imports - ensuring personal bests are tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

const getPersonalBestsData = unstable_cache(
  async (): Promise<PersonalBestsAPIResponseData | null> => {
    console.log('Fetching fresh personal bests data from DB.');
    
    // Multi-tenant: Use tenant-scoped query for personal bests
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    const latestPb = await tenantPrisma.aggregated_personal_bests.findFirst({
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
  },
  ['personal_bests'],
  {
    tags: [CACHE_TAGS.PERSONAL_BESTS],
    revalidate: 3600,
  }
);

export async function GET() {
  try {
    const data = await getPersonalBestsData();
    // Return success: true for consistency with how other components might handle this
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch personal bests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch personal bests', details: error },
      { status: 500 }
    );
  }
} 