import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Refreshing cache metadata only...');
    
    // Clear all caches
    apiCache.clear();
    
    // Update cache metadata timestamps only
    const now = new Date();
    await prisma.$transaction([
      prisma.cache_metadata.updateMany({
        data: { last_invalidated: now }
      })
    ]);
    
    console.log('Cache refresh completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache refreshed successfully',
      timestamp: now
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh cache',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 