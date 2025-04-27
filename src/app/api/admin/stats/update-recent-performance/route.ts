import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';

export async function POST(request: Request) {
  console.log('[update-recent-performance API] POST request received');
  const startTime = Date.now();
  
  try {
    const { config, requestId } = await request.json();
    console.log(`[update-recent-performance API] Request ID: ${requestId || 'none'}, Config: ${JSON.stringify(config || {})}`);
    
    // Execute in a transaction with a timeout
    console.log('[update-recent-performance API] Starting updateRecentPerformance function...');
    
    let functionResult;
    try {
      await prisma.$transaction(
        async (tx) => {
          console.log('[update-recent-performance API] Inside transaction');
          await updateRecentPerformance(tx);
          console.log('[update-recent-performance API] Transaction completed successfully');
        },
        { timeout: 60000 } // 60 second timeout
      );
      functionResult = 'success';
    } catch (txError) {
      console.error('[update-recent-performance API] ❌ Transaction failed:', txError);
      if (txError instanceof Error) {
        console.error('[update-recent-performance API] Transaction error name:', txError.name);
        console.error('[update-recent-performance API] Transaction error message:', txError.message);
      }
      functionResult = 'error';
      throw txError; // Rethrow for the outer catch
    }
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`[update-recent-performance API] ✓ Recent Performance updated successfully in ${executionTime}ms`);
    
    // Return success response WITHOUT inProgress flag to signal completion
    console.log('[update-recent-performance API] Responding with completion signal, completed=true');
    const responseObj = { 
      success: true, 
      message: 'Recent Performance updated successfully',
      completed: true,
      executionTime,
      functionResult
    };
    console.log(`[update-recent-performance API] Full response object: ${JSON.stringify(responseObj)}`);
    return NextResponse.json(responseObj);
  } catch (error) {
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.error(`[update-recent-performance API] Error in Recent Performance update after ${executionTime}ms:`, error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('[update-recent-performance API] Error name:', error.name);
      console.error('[update-recent-performance API] Error message:', error.message);
      console.error('[update-recent-performance API] Error stack:', error.stack);
      
      // Handle specific error types
      if (error.name === 'PrismaClientInitializationError') {
        const errorObj = { 
          success: false, 
          error: 'Database connection error. Please try again.',
          executionTime
        };
        console.error(`[update-recent-performance API] Returning error response: ${JSON.stringify(errorObj)}`);
        return NextResponse.json(errorObj, { status: 503 });
      }
      
      // Handle transaction timeout errors
      if (error.message.includes('transaction timeout')) {
        const errorObj = { 
          success: false, 
          error: 'Database operation timed out. Try reducing the data batch size.',
          executionTime
        };
        console.error(`[update-recent-performance API] Returning timeout response: ${JSON.stringify(errorObj)}`);
        return NextResponse.json(errorObj, { status: 408 });
      }
    }
    
    const errorObj = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      completed: false,
      executionTime
    };
    console.error(`[update-recent-performance API] Returning generic error response: ${JSON.stringify(errorObj)}`);
    return NextResponse.json(errorObj, { status: 500 });
  }
} 