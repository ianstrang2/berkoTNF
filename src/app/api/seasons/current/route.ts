import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/seasons/current - Get current season based on today's date
export async function GET() {
  try {
    const currentSeason = await prisma.$queryRaw`
      SELECT 
        id,
        start_date,
        half_date,
        end_date,
        get_season_display_name(start_date, end_date) as display_name,
        created_at,
        updated_at
      FROM seasons
      WHERE CURRENT_DATE BETWEEN start_date AND end_date
      LIMIT 1
    ` as Array<{
      id: number;
      start_date: Date;
      half_date: Date;
      end_date: Date;
      display_name: string;
      created_at: Date;
      updated_at: Date;
    }>;

    if (currentSeason.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No current season found',
        data: null
      });
    }

    const season = currentSeason[0];

    return NextResponse.json({
      success: true,
      data: {
        id: season.id.toString(),
        startDate: season.start_date.toISOString().split('T')[0],
        halfDate: season.half_date.toISOString().split('T')[0],
        endDate: season.end_date.toISOString().split('T')[0],
        displayName: season.display_name,
        createdAt: season.created_at.toISOString(),
        updatedAt: season.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching current season:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch current season' },
      { status: 500 }
    );
  }
}
