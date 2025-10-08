import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring season race data is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'whole_season';
  let seasonYear = new Date().getFullYear(); // Default fallback
  
  try {
    // Validate period parameter
    if (!['whole_season', 'current_half'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period parameter. Use "whole_season" or "current_half"' },
        { status: 400 }
      );
    }
    
    // Multi-tenant: Get tenant context for scoped queries
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Get current season to find the correct season_year
    const currentSeason = await prisma.$queryRaw`
      SELECT id, start_date, end_date
      FROM seasons 
      WHERE CURRENT_DATE BETWEEN start_date AND end_date 
        AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    ` as Array<{ id: number; start_date: Date; end_date: Date }>;

    if (currentSeason.length === 0) {
      console.warn(`No current season found for race data`);
      return NextResponse.json({
        success: true,
        data: { players: [], lastUpdated: null, periodType: period }
      });
    }

    seasonYear = currentSeason[0].start_date.getFullYear();
    
    const raceData = await prisma.aggregated_season_race_data.findFirst({
      where: { 
        tenant_id: tenantId,
        season_year: seasonYear,
        period_type: period 
      },
      select: { player_data: true, last_updated: true, period_type: true }
    });

    if (!raceData) {
      console.warn(`No season race data found for year ${seasonYear}, period ${period}`);
      return NextResponse.json({
        success: true,
        data: { players: [], lastUpdated: null, periodType: period }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        players: raceData.player_data,
        lastUpdated: raceData.last_updated,
        periodType: raceData.period_type
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
} 