import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring current season is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// GET /api/seasons/current - Get current season based on today's date
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const currentSeason = await prisma.$queryRaw`
      SELECT 
        id,
        start_date,
        half_date,
        end_date,
        created_at,
        updated_at
      FROM seasons
      WHERE CURRENT_DATE BETWEEN start_date AND end_date
      AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    ` as Array<{
      id: number;
      start_date: Date;
      half_date: Date;
      end_date: Date;
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
    
    // Generate display name from dates (fallback for when SQL function isn't available)
    const startYear = season.start_date.getFullYear();
    const endYear = season.end_date.getFullYear();
    const displayName = startYear === endYear ? startYear.toString() : `${startYear}-${endYear}`;

    return NextResponse.json({
      success: true,
      data: {
        id: season.id.toString(),
        startDate: season.start_date.toISOString().split('T')[0],
        halfDate: season.half_date.toISOString().split('T')[0],
        endDate: season.end_date.toISOString().split('T')[0],
        displayName: displayName,
        createdAt: season.created_at.toISOString(),
        updatedAt: season.updated_at.toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError);
}
