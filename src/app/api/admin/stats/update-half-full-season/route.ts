import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateHalfAndFullSeasonStats } from '@/lib/stats/updateHalfAndFullSeasonStats';

export async function POST(request: Request) {
  try {
    const { config, requestId } = await request.json();
    
    console.log('[update-half-full-season API] Starting update with request ID:', requestId || 'none');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateHalfAndFullSeasonStats(tx, config);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('[update-half-full-season API] ✓ Half & Full Season Stats updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Half & Full Season Stats updated successfully',
      completed: true
    });
  } catch (error) {
    console.error('[update-half-full-season API] Error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 