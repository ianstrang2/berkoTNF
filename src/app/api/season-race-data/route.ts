import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const currentYear = new Date().getFullYear();
    
    const raceData = await prisma.aggregated_season_race_data.findFirst({
      where: { season_year: currentYear },
      select: { player_data: true, last_updated: true }
    });

    if (!raceData) {
      console.warn(`No season race data found for year ${currentYear}`);
      return NextResponse.json({
        success: true,
        data: { players: [], lastUpdated: null }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        players: raceData.player_data,
        lastUpdated: raceData.last_updated
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