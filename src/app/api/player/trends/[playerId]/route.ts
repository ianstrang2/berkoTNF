import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerWithTrend } from '@/lib/transform/player.transform';
import { PlayerWithTrend } from '@/types/player.types';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';

// Define a function to fetch and cache the data
const getPlayerTrends = unstable_cache(
  async (playerId: number): Promise<PlayerWithTrend | null> => {
    console.log(`Fetching EWMA trend data for player ID: ${playerId}`);
    
    // Fetch EWMA performance ratings directly - all data in aggregated table
    const trendData = await prisma.aggregated_performance_ratings.findUnique({
      where: { player_id: playerId }
      // No JOIN needed - all player data is in the aggregated table
    });

    if (!trendData) {
      return null;
    }

    // All data now comes directly from aggregated table
    const dbPlayer = {
      player_id: trendData.player_id,
      name: trendData.name,
      is_retired: trendData.is_retired,
      is_ringer: trendData.is_ringer,
      selected_club: trendData.selected_club,
      power_rating: trendData.power_rating,
      goal_threat: trendData.goal_threat,
      participation: trendData.participation,
      power_percentile: trendData.power_percentile,
      goal_percentile: trendData.goal_percentile,
      participation_percentile: trendData.participation_percentile,
    };
    return toPlayerWithTrend(dbPlayer);
  },
  ['player_trends_v7'], // Updated cache key for simplified EWMA-only approach
  {
    tags: [CACHE_TAGS.PLAYER_POWER_RATING],
  }
);

export async function GET(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  const playerId = parseInt(params.playerId, 10);
  if (isNaN(playerId)) {
    return NextResponse.json({ success: false, error: 'Invalid player ID' }, { status: 400 });
  }

  try {
    const data = await getPlayerTrends(playerId);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Player trend data not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(`Database Error fetching trends for player ${playerId}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player trends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 