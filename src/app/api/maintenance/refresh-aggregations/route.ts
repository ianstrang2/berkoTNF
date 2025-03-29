import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

export async function GET() {
  try {
    console.log('Refreshing pre-aggregated data...');
    
    // Clear all caches
    apiCache.clear();
    
    // Execute stored procedures for refreshing aggregated data
    await prisma.$executeRaw`SELECT update_season_stats();`;
    await prisma.$executeRaw`SELECT update_all_time_stats();`;
    
    // Update cache metadata timestamps
    const now = new Date();
    await prisma.$transaction([
      prisma.cache_metadata.updateMany({
        data: { last_invalidated: now }
      })
    ]);
    
    console.log('Pre-aggregated data refresh completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pre-aggregated data refreshed successfully',
      timestamp: now
    });
  } catch (error) {
    console.error('Error refreshing pre-aggregated data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh pre-aggregated data',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 