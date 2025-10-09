import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match validation is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// POST /api/seasons/validate-match - Validate match can be created (has active season)
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();
    const { matchDate } = body;

    if (!matchDate) {
      return NextResponse.json(
        { success: false, error: 'Match date is required' },
        { status: 400 }
      );
    }

    const season = await prisma.$queryRaw`
      SELECT 
        id,
        start_date,
        half_date,
        end_date,
        get_season_display_name(start_date, end_date) as display_name
      FROM seasons
      WHERE ${matchDate}::date BETWEEN start_date AND end_date
        AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    ` as Array<{
      id: number;
      start_date: Date;
      half_date: Date;
      end_date: Date;
      display_name: string;
    }>;

    if (season.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No season exists for this match date',
        canCreate: false,
        season: null
      });
    }

    const seasonData = season[0];

    return NextResponse.json({
      success: true,
      canCreate: true,
      season: {
        id: seasonData.id.toString(),
        startDate: seasonData.start_date.toISOString().split('T')[0],
        halfDate: seasonData.half_date.toISOString().split('T')[0],
        endDate: seasonData.end_date.toISOString().split('T')[0],
        displayName: seasonData.display_name
      }
    });
  }).catch(handleTenantError);
}
