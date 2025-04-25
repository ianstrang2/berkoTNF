import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateAllTimeStats } from '@/lib/stats/updateAllTimeStats';

export async function POST(request: Request) {
  try {
    const { config, requestId } = await request.json();
    
    console.log('[update-all-time-stats API] Starting update with request ID:', requestId || 'none');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateAllTimeStats(tx, config);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('[update-all-time-stats API] ✓ All-Time Stats updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All-Time Stats updated successfully',
      completed: true
    });
  } catch (error) {
    console.error('[update-all-time-stats API] Error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 