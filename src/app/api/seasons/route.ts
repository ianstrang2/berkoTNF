import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Phase 2: Using withTenantContext for automatic RLS setup
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// Phase 2: GET /api/seasons with automatic RLS context
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Middleware automatically sets RLS context
    
    const seasons = await prisma.$queryRaw`
      SELECT 
        id,
        start_date,
        half_date,
        end_date,
        get_season_display_name(start_date, end_date) as display_name,
        created_at,
        updated_at
      FROM seasons
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY start_date DESC
    ` as Array<{
      id: number;
      start_date: Date;
      half_date: Date;
      end_date: Date;
      display_name: string;
      created_at: Date;
      updated_at: Date;
    }>;

    return NextResponse.json({
      success: true,
      data: seasons.map(season => ({
        id: season.id.toString(),
        startDate: season.start_date.toISOString().split('T')[0],
        halfDate: season.half_date.toISOString().split('T')[0],
        endDate: season.end_date.toISOString().split('T')[0],
        displayName: season.display_name,
        createdAt: season.created_at.toISOString(),
        updatedAt: season.updated_at.toISOString()
      }))
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError);
}

// Phase 2: POST /api/seasons - Create new season with automatic RLS context
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Middleware automatically sets RLS context
    
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

    // Check for overlaps using database constraint
    try {
      const newSeason = await prisma.$queryRaw`
        INSERT INTO seasons (start_date, half_date, end_date, tenant_id)
        VALUES (${startDate}, ${halfDate.toISOString().split('T')[0]}, ${endDate}, ${tenantId})
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

      const season = newSeason[0];

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
  }).catch(handleTenantError);
}
