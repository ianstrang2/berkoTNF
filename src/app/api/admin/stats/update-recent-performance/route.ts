import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';

// Track current state with a simple global variable
// This isn't ideal for production, but works for quick fixes
let processingState = {
  isProcessing: false,
  lastStartTime: null as number | null,
  currentRequestId: null as string | null
};

export async function POST(request: Request) {
  console.log('[update-recent-performance API] POST request received');
  
  try {
    const { config, requestId } = await request.json();
    console.log(`[update-recent-performance API] Parsed request body: config=${!!config}, requestId=${requestId || 'none'}`);
    
    // If we're already processing, don't start another process
    if (processingState.isProcessing) {
      console.log(`[update-recent-performance API] Already processing a request. Current: ${processingState.currentRequestId}, Requested: ${requestId}`);
      
      // If this is the same request that's already processing, just return the current status
      if (requestId && requestId === processingState.currentRequestId) {
        return NextResponse.json({ 
          success: true, 
          message: 'Already processing this request',
          inProgress: true,
          requestId
        });
      }
      
      // If it's been more than 60 seconds, consider the last process stalled
      if (processingState.lastStartTime && Date.now() - processingState.lastStartTime > 60000) {
        console.log(`[update-recent-performance API] Previous process appears stalled, resetting state`);
        processingState.isProcessing = false;
      } else {
        // Otherwise, reject the new request
        return NextResponse.json({ 
          success: false, 
          message: 'Another process is already running. Please try again later.',
          requestId
        }, { status: 409 });
      }
    }
    
    // Mark as processing
    processingState.isProcessing = true;
    processingState.lastStartTime = Date.now();
    processingState.currentRequestId = requestId || `auto-${Date.now()}`;
    
    console.log(`[update-recent-performance API] Starting Recent Performance update with request ID: ${processingState.currentRequestId}`);
    
    try {
      // Execute in a transaction with a timeout
      await prisma.$transaction(
        async (tx) => {
          console.log('[update-recent-performance API] Transaction started, calling updateRecentPerformance...');
          await updateRecentPerformance(tx);
          console.log('[update-recent-performance API] updateRecentPerformance function completed successfully');
        },
        { timeout: 60000 } // 60 second timeout
      );
      
      console.log('[update-recent-performance API] ✓ Recent Performance updated successfully - transaction committed');
      
      // Reset processing state
      processingState.isProcessing = false;
      processingState.lastStartTime = null;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Recent Performance updated successfully',
        requestId: processingState.currentRequestId
      });
    } catch (txError) {
      // Reset processing state on error
      processingState.isProcessing = false;
      processingState.lastStartTime = null;
      
      // Rethrow to be caught by the outer handler
      throw txError;
    }
  } catch (error) {
    // Reset processing state
    processingState.isProcessing = false;
    processingState.lastStartTime = null;
    
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
    } else {
      console.error('[update-recent-performance API] Non-Error object thrown:', error);
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 