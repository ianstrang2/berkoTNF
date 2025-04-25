import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateMatchReportCache } from '@/lib/stats/updateMatchReportCache';

export async function POST(request: Request) {
  try {
    const { config, requestId } = await request.json();
    
    console.log('[update-match-report API] Starting update with request ID:', requestId || 'none');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateMatchReportCache(tx);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('[update-match-report API] ✓ Match Report Cache updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Match Report Cache updated successfully',
      completed: true
    });
  } catch (error) {
    console.error('[update-match-report API] Error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 