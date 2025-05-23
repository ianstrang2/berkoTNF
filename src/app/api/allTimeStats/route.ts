import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET(request: NextRequest) {
  try {
    // Try to get data from cache first
    const cachedData = await apiCache.get('all_time_stats');
    
    if (cachedData) {
      console.log('Returning cached all-time stats data');
      return NextResponse.json({
        data: cachedData,
        fromCache: true
      },
      {
        headers: {
          'Cache-Control': 'max-age=60, must-revalidate'
        }
      });
    }

    console.log('Cache miss. Fetching all-time stats data...');

    // Check if we have pre-aggregated data
    const preAggregatedData = await prisma.aggregated_all_time_stats.findMany({
      include: {
        player: {
          select: {
            name: true,
            is_retired: true,
            selected_club: true
          }
        }
      },
      orderBy: {
        fantasy_points: 'desc'
      }
    });
    
    let responseData;

    if (preAggregatedData.length > 0) {
      console.log('Using pre-aggregated all-time stats data');
      
      // Format the data to match expected structure
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
        points_per_game: stat.points_per_game
      }));
      
      responseData = serializeData(allTimeStats);
    } else {
      console.log('No pre-aggregated all-time stats data available. Returning empty set.');
      responseData = serializeData([]); // Return empty array if no pre-aggregated data
    }
      
    // Store in cache for future requests
    apiCache.set('all_time_stats', responseData);
      
    return NextResponse.json({ data: responseData }, {
      headers: {
        'Cache-Control': 'max-age=60, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}