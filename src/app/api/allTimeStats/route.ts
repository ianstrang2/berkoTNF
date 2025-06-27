import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';

const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

// Define a function to fetch and cache the data
const getAllTimeStats = unstable_cache(
  async () => {
    console.log('Fetching fresh all-time stats data from DB.');
    const preAggregatedData = await prisma.aggregated_all_time_stats.findMany({
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

    if (preAggregatedData.length > 0) {
      const allTimeStats = preAggregatedData.map(stat => ({
        name: stat.player.name,
        is_retired: stat.player.is_retired,
        selected_club: stat.player.selected_club,
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
      }));
      return serializeData(allTimeStats);
    }
    return [];
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