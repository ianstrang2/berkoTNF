import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get player rating data for admin debugging - EWMA only
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 });
    }

    // Fetch EWMA data and config
    const [ewmaRatings, appConfig] = await Promise.all([
      // EWMA performance ratings
      prisma.aggregated_performance_ratings.findUnique({
        where: { player_id: numericId },
        select: {
          power_rating: true,
          goal_threat: true,
          participation: true,
          power_percentile: true,
          goal_percentile: true,
          participation_percentile: true,
          is_qualified: true,
          weighted_played: true,
          first_match_date: true,
          updated_at: true
        }
      }),

      // Get current half-life setting from app_config
      prisma.app_config.findUnique({
        where: { config_key: 'performance_half_life_days' }
      })
    ]);

    // SIMPLIFIED: EWMA-only response with proper Decimal to number conversion
    return NextResponse.json({
      success: true,
      data: {
        // EWMA ratings data - convert Prisma Decimal types to numbers
        ewmaRatings: ewmaRatings ? {
          power_rating: Number(ewmaRatings.power_rating),
          goal_threat: Number(ewmaRatings.goal_threat),
          participation: Number(ewmaRatings.participation),
          power_percentile: Number(ewmaRatings.power_percentile),
          goal_percentile: Number(ewmaRatings.goal_percentile),
          participation_percentile: Number(ewmaRatings.participation_percentile),
          is_qualified: ewmaRatings.is_qualified,
          weighted_played: Number(ewmaRatings.weighted_played),
          first_match_date: ewmaRatings.first_match_date,
          updated_at: ewmaRatings.updated_at,
          half_life_days: parseInt(appConfig?.config_value || '730')
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching rating data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rating data' },
      { status: 500 }
    );
  }
} 