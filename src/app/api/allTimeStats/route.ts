import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring all-time stats are tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

// Define a function to fetch and cache the data
const getAllTimeStats = unstable_cache(
  async () => {
    console.log('Fetching fresh all-time stats data from DB.');
    
    // Multi-tenant: Use tenant-scoped query for all-time stats
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const preAggregatedData = await prisma.aggregated_all_time_stats.findMany({
      where: { tenant_id: tenantId },
      orderBy: {
        fantasy_points: 'desc',
      },
    });

    const allTimeStats = preAggregatedData.map(stat => {
      // All data now comes directly from aggregated table - no JOIN needed
      const dbPlayer = { 
        player_id: stat.player_id,
        name: stat.name,
        is_retired: stat.is_retired,
        selected_club: stat.selected_club,
        games_played: stat.games_played,
        wins: stat.wins,
        draws: stat.draws,
        losses: stat.losses,
        goals: stat.goals,
        win_percentage: stat.win_percentage,
        minutes_per_goal: stat.minutes_per_goal,
        heavy_wins: stat.heavy_wins,
        heavy_win_percentage: stat.heavy_win_percentage,
        heavy_losses: stat.heavy_losses,
        heavy_loss_percentage: stat.heavy_loss_percentage,
        clean_sheets: stat.clean_sheets,
        clean_sheet_percentage: stat.clean_sheet_percentage,
        fantasy_points: stat.fantasy_points,
        points_per_game: stat.points_per_game,
      };
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