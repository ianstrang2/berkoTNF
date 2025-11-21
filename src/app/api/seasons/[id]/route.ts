import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring season operations are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/seasons/[id] - Get specific season
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withTenantContext(request, async (tenantId) => {
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
        AND tenant_id = ${tenantId}::uuid
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
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      },
    });
  }).catch(handleTenantError);
}

// PUT /api/seasons/[id] - Update season
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withTenantContext(request, async (tenantId) => {
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
      // ✅ SECURITY: Verify season belongs to tenant before updating
      const existingSeason = await prisma.seasons.findUnique({
        where: { id: seasonId },
        select: { tenant_id: true }
      });

      if (!existingSeason) {
        return NextResponse.json(
          { success: false, error: 'Season not found' },
          { status: 404 }
        );
      }

      if (existingSeason.tenant_id !== tenantId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Season belongs to different tenant' },
          { status: 403 }
        );
      }

      // Update the season using Prisma's standard update
      const updatedSeason = await prisma.seasons.update({
        where: { id: seasonId },
        data: {
          start_date: new Date(startDate),
          half_date: halfDate,
          end_date: new Date(endDate),
          updated_at: new Date()
        }
      });

      // Get the display name using a separate query since we can't use the function in Prisma
      const displayNameResult = await prisma.$queryRaw`
        SELECT get_season_display_name(${startDate}::date, ${endDate}::date) as display_name
      ` as Array<{ display_name: string }>;

      return NextResponse.json({
        success: true,
        data: {
          id: updatedSeason.id.toString(),
          startDate: updatedSeason.start_date.toISOString().split('T')[0],
          halfDate: updatedSeason.half_date.toISOString().split('T')[0],
          endDate: updatedSeason.end_date.toISOString().split('T')[0],
          displayName: displayNameResult[0]?.display_name || 'Unknown',
          createdAt: updatedSeason.created_at?.toISOString() || '',
          updatedAt: updatedSeason.updated_at?.toISOString() || ''
        }
      });
    } catch (dbError: any) {
      if (dbError.code === '23P01') { // Exclusion constraint violation
        return NextResponse.json(
          { success: false, error: 'Season dates overlap with an existing season' },
          { status: 409 }
        );
      }
      console.error('Season update error:', dbError);
      throw dbError;
    }
  }).catch(handleTenantError);
}

// DELETE /api/seasons/[id] - Delete season
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withTenantContext(request, async (tenantId) => {
    const seasonId = parseInt(params.id);

    if (isNaN(seasonId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid season ID' },
        { status: 400 }
      );
    }

    const deletedSeason = await prisma.$queryRaw`
      DELETE FROM seasons WHERE id = ${seasonId}
        AND tenant_id = ${tenantId}::uuid
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
  }).catch(handleTenantError);
}
