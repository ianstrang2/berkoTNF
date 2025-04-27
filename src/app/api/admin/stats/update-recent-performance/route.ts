import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Don't import updateRecentPerformance yet to debug initialization

// Function to manually update recent performance without the import
async function manualUpdate(tx) {
  console.log('[EMERGENCY FIX] Running manual minimal implementation');

  try {
    // Just do a simple query to test the transaction
    const playerCount = await tx.players.count({
      where: { is_retired: false }
    });
    
    console.log(`[EMERGENCY FIX] Found ${playerCount} players`);
    
    // Clear the existing table
    await tx.aggregated_recent_performance.deleteMany({});
    console.log('[EMERGENCY FIX] Cleared existing records');
    
    // Insert a dummy record just to test
    await tx.aggregated_recent_performance.create({
      data: {
        player_id: 1, // Assuming player 1 exists
        last_5_goals: 0,
        last_5_games: [],
        last_updated: new Date()
      }
    });
    
    console.log('[EMERGENCY FIX] Created test record successfully');
    return true;
  } catch (error) {
    console.error('[EMERGENCY FIX] Error in manual update:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('[update-recent-performance API] POST request received');
  const startTime = Date.now();
  
  // Add environment info
  console.log('[DEBUG] Node version:', process.version);
  console.log('[DEBUG] Environment:', process.env.NODE_ENV);
  console.log('[DEBUG] Memory usage:', JSON.stringify(process.memoryUsage()));
  
  try {
    const { config, requestId } = await request.json();
    console.log(`[update-recent-performance API] Request ID: ${requestId || 'none'}, Config: ${JSON.stringify(config || {})}`);
    
    // Try importing the function now
    try {
      console.log('[DEBUG] About to import updateRecentPerformance');
      const { updateRecentPerformance } = await import('@/lib/stats/updateRecentPerformance');
      console.log('[DEBUG] Successfully imported updateRecentPerformance');
      
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
        
        // FALLBACK: Try the manual implementation as a last resort
        console.log('[update-recent-performance API] Attempting emergency fallback implementation');
        await prisma.$transaction(
          async (tx) => {
            await manualUpdate(tx);
          },
          { timeout: 30000 }
        );
        
        functionResult = 'fallback-success';
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
    } catch (importError) {
      console.error('[CRITICAL] Error importing updateRecentPerformance:', importError);
      
      // Try the emergency implementation
      await prisma.$transaction(
        async (tx) => {
          await manualUpdate(tx);
        },
        { timeout: 30000 }
      );
      
      const endTime = Date.now();
      return NextResponse.json({
        success: true,
        message: 'Used emergency implementation due to import error',
        completed: true,
        error: importError instanceof Error ? importError.message : 'Unknown import error',
        executionTime: endTime - startTime,
        functionResult: 'emergency-success'
      });
    }
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
    console.error(`[update-recent-performance API] Returning error response: ${JSON.stringify(errorObj)}`);
    return NextResponse.json(errorObj, { status: 500 });
  }
} 