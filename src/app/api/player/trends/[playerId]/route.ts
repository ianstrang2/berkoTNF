import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerWithTrend } from '@/lib/transform/player.transform';
import { PlayerWithTrend } from '@/types/player.types';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';

interface HistoricalData {
  historical_blocks: any[];
}

// Define a function to fetch and cache the data
const getPlayerTrends = unstable_cache(
  async (playerId: number): Promise<PlayerWithTrend | null> => {
    console.log(`Fetching fresh player trend data for player ID: ${playerId}`);
    
    // Fetch both the pre-calculated ratings and the historical blocks for sparklines
    const [trendData, historicalData] = await Promise.all([
      prisma.aggregated_player_power_ratings.findUnique({
        where: { player_id: playerId },
        include: { players: { select: { name: true, is_retired: true, selected_club: true } } },
      }),
      prisma.aggregated_half_season_stats.findUnique({
        where: { player_id: playerId },
        select: {
          historical_blocks: true,
        } as any,
      }) as Promise<HistoricalData | null>,
    ]);

    if (!trendData || !historicalData) {
      return null;
    }

    // Process historical blocks into sparkline data
    const blocks = historicalData.historical_blocks || [];
    const sparklineData = blocks.slice(-6).map((block: any) => {
        if (!block || block.games_played < 3) {
            return null;
        }
        return {
            period: block.start_date.substring(0, 7),
            power_rating: block.power_rating,
            goal_threat: block.goal_threat,
            power_rating_percentile: block.power_rating_percentile,
            goal_threat_percentile: block.goal_threat_percentile,
            participation_percentile: block.participation_percentile,
            games_played: block.games_played,
        };
    }).filter(Boolean);

    const dbPlayer = { ...trendData, ...trendData.players };
    const transformedPlayer = toPlayerWithTrend(dbPlayer);

    return {
      ...transformedPlayer,
      sparkline_data: sparklineData,
    };
  },
  ['player_trends'],
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