import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/seasons/[id] - Get specific season
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const seasonId = parseInt(params.id);

    if (isNaN(seasonId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid season ID' },
        { status: 400 }
      );
    }

    const season = await prisma.$queryRaw`
      SELECT 
        id,
        start_date,
        half_date,
        end_date,
        get_season_display_name(start_date, end_date) as display_name,
        created_at,
        updated_at
      FROM seasons
      WHERE id = ${seasonId}
    ` as Array<{
      id: number;
      start_date: Date;
      half_date: Date;
      end_date: Date;
      display_name: string;
      created_at: Date;
      updated_at: Date;
    }>;

    if (season.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Season not found' },
        { status: 404 }
      );
    }

    const seasonData = season[0];

    return NextResponse.json({
      success: true,
      data: {
        id: seasonData.id.toString(),
        startDate: seasonData.start_date.toISOString().split('T')[0],
        halfDate: seasonData.half_date.toISOString().split('T')[0],
        endDate: seasonData.end_date.toISOString().split('T')[0],
        displayName: seasonData.display_name,
        createdAt: seasonData.created_at.toISOString(),
        updatedAt: seasonData.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch season' },
      { status: 500 }
    );
  }
}

// PUT /api/seasons/[id] - Update season
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const seasonId = parseInt(params.id);

    if (isNaN(seasonId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid season ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Calculate half date (midpoint)
    const timeDiff = end.getTime() - start.getTime();
    const halfDate = new Date(start.getTime() + timeDiff / 2);

    try {
      const updatedSeason = await prisma.$queryRaw`
        UPDATE seasons 
        SET 
          start_date = ${startDate},
          half_date = ${halfDate.toISOString().split('T')[0]},
          end_date = ${endDate},
          updated_at = NOW()
        WHERE id = ${seasonId}
        RETURNING 
          id,
          start_date,
          half_date,
          end_date,
          get_season_display_name(start_date, end_date) as display_name,
          created_at,
          updated_at
      ` as Array<{
        id: number;
        start_date: Date;
        half_date: Date;
        end_date: Date;
        display_name: string;
        created_at: Date;
        updated_at: Date;
      }>;

      if (updatedSeason.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Season not found' },
          { status: 404 }
        );
      }

      const season = updatedSeason[0];

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
    } catch (dbError: any) {
      if (dbError.code === '23P01') { // Exclusion constraint violation
        return NextResponse.json(
          { success: false, error: 'Season dates overlap with an existing season' },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating season:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update season' },
      { status: 500 }
    );
  }
}

// DELETE /api/seasons/[id] - Delete season
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const seasonId = parseInt(params.id);

    if (isNaN(seasonId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid season ID' },
        { status: 400 }
      );
    }

    // Check if season has matches
    const matchCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM matches WHERE season_id = ${seasonId}
    ` as Array<{ count: bigint }>;

    if (Number(matchCount[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete season that has matches' },
        { status: 409 }
      );
    }

    const deletedSeason = await prisma.$queryRaw`
      DELETE FROM seasons WHERE id = ${seasonId}
      RETURNING id
    ` as Array<{ id: number }>;

    if (deletedSeason.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Season not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Season deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting season:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete season' },
      { status: 500 }
    );
  }
}
