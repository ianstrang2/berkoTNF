import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'whole_season';
    const currentYear = new Date().getFullYear();
    
    // Validate period parameter
    if (!['whole_season', 'current_half'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period parameter. Use "whole_season" or "current_half"' },
        { status: 400 }
      );
    }
    
    const raceData = await prisma.aggregated_season_race_data.findFirst({
      where: { 
        season_year: currentYear,
        period_type: period 
      },
      select: { player_data: true, last_updated: true, period_type: true }
    });

    if (!raceData) {
      console.warn(`No season race data found for year ${currentYear}, period ${period}`);
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
    // Enhanced error logging for production debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      timestamp: new Date().toISOString(),
      endpoint: '/api/season-race-data',
      method: 'GET',
      currentYear: new Date().getFullYear()
    };
    
    console.error('Season race data API error:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch season race data',
        // Only include detailed error info in development
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
} 