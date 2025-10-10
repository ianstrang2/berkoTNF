import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerWithStats } from '@/lib/transform/player.transform';
// Phase 2: Using withTenantContext for automatic RLS setup
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';

// Phase 2: Helper function no longer needs manual RLS setup
async function getAllTimeStats(tenantId: string) {
  console.log(`Fetching fresh all-time stats data from DB for tenant ${tenantId}`);
    
    // RLS disabled on aggregated tables - using explicit tenant filter
    const preAggregatedData = await prisma.aggregated_all_time_stats.findMany({
      where: withTenantFilter(tenantId),
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

// Phase 2: Use withTenantContext wrapper
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await getAllTimeStats(tenantId);
    return NextResponse.json({ data }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError);
}