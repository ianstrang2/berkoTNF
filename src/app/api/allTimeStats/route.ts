import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring all-time stats are tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// Define a function to fetch and cache the data
// Note: Removed unstable_cache to prevent cross-tenant data leaks  
async function getAllTimeStats(tenantId: string) {
  console.log(`Fetching fresh all-time stats data from DB for tenant ${tenantId}`);
    
    // Multi-tenant: Use tenant-scoped query for all-time stats
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
  }

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);
    const data = await getAllTimeStats(tenantId);
    return NextResponse.json({ data }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
}