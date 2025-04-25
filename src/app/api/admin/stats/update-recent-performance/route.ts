import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';

export async function POST(request: Request) {
  console.log('[update-recent-performance API] POST request received');
  
  try {
    const { config, requestId } = await request.json();
    console.log(`[update-recent-performance API] Request ID: ${requestId || 'none'}`);
    
    // Execute in a transaction with a timeout
    console.log('[update-recent-performance API] Starting updateRecentPerformance function...');
    await prisma.$transaction(
      async (tx) => {
        await updateRecentPerformance(tx);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('[update-recent-performance API] ✓ Recent Performance updated successfully');
    
    // Return success response WITHOUT inProgress flag to signal completion
    console.log('[update-recent-performance API] Responding with completion signal, completed=true');
    return NextResponse.json({ 
      success: true, 
      message: 'Recent Performance updated successfully',
      completed: true
    });
  } catch (error) {
    console.error('[update-recent-performance API] Error in Recent Performance update:', error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('[update-recent-performance API] Error name:', error.name);
      console.error('[update-recent-performance API] Error message:', error.message);
      console.error('[update-recent-performance API] Error stack:', error.stack);
      
      // Handle specific error types
      if (error.name === 'PrismaClientInitializationError') {
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection error. Please try again.'
        }, { status: 503 });
      }
      
      // Handle transaction timeout errors
      if (error.message.includes('transaction timeout')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Database operation timed out. Try reducing the data batch size.'
        }, { status: 408 });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 