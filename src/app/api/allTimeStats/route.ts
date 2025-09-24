import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring all-time stats are tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

// Define a function to fetch and cache the data
const getAllTimeStats = unstable_cache(
  async () => {
    console.log('Fetching fresh all-time stats data from DB.');
    
    // Multi-tenant: Use tenant-scoped query for all-time stats
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    const preAggregatedData = await tenantPrisma.aggregated_all_time_stats.findMany({
      include: {
        player: {
          select: {
            name: true,
            is_retired: true,
            selected_club: true,
          },
        },
      },
      orderBy: {
        fantasy_points: 'desc',
      },
    });

    const allTimeStats = preAggregatedData.map(stat => {
      const dbPlayer = { ...stat, ...(stat as any).player };
      return toPlayerWithStats(dbPlayer);
    });

    return allTimeStats;
  },
  ['all_time_stats'], // Unique key for this cache entry
  {
    tags: [CACHE_TAGS.ALL_TIME_STATS], // Tag for revalidation
    revalidate: 3600, // Optional: revalidate every hour
  }
);

export async function GET() {
  try {
    const data = await getAllTimeStats();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}