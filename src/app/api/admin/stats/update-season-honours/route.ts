import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateSeasonHonours } from '@/lib/stats/updateSeasonHonours';

export async function POST(request: Request) {
  try {
    const { config, requestId } = await request.json();
    
    console.log('[update-season-honours API] Starting update with request ID:', requestId || 'none');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateSeasonHonours(tx, config);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('[update-season-honours API] ✓ Season Honours updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Season Honours updated successfully',
      completed: true
    });
  } catch (error) {
    console.error('[update-season-honours API] Error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 