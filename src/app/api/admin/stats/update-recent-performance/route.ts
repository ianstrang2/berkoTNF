import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';

// Keep track of recently processed requests to avoid duplicates
const processedRequests = new Set<string>();
// Clean up old request IDs periodically to prevent memory leaks
setInterval(() => {
  const oneMinuteAgo = Date.now() - 60000;
  processedRequests.forEach(id => {
    const [timestamp] = id.split('-');
    if (parseInt(timestamp, 36) < oneMinuteAgo) {
      processedRequests.delete(id);
    }
  });
}, 60000);

export async function POST(request: Request) {
  console.log('[update-recent-performance API] POST request received');
  
  try {
    const { config, requestId } = await request.json();
    console.log(`[update-recent-performance API] Parsed request body: config=${!!config}, requestId=${requestId || 'none'}`);
    
    // Check if this is a duplicate request
    if (requestId && processedRequests.has(requestId)) {
      console.log(`[update-recent-performance API] Duplicate request detected with ID: ${requestId}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Request already processed', 
        duplicate: true 
      });
    }
    
    // Track this request ID to prevent duplicates
    if (requestId) {
      processedRequests.add(requestId);
    }
    
    console.log('[update-recent-performance API] Starting Recent Performance update step...');
    
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
    
    return NextResponse.json({ 
      success: true, 
      message: 'Recent Performance updated successfully',
      requestId
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
    } else {
      console.error('[update-recent-performance API] Non-Error object thrown:', error);
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 