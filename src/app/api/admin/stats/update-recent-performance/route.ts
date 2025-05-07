import { NextResponse } from 'next/server';
// Remove prisma import if not used directly here after removing transaction
// import { prisma } from '@/lib/prisma'; 
// Import the function we need to call
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance'; 

// Function to manually update recent performance without the import
// Keep manualUpdate in case it was used by fallback logic, though transaction is removed
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
    
    // Try importing the function (if not already imported globally)
    // const { updateRecentPerformance } = await import('@/lib/stats/updateRecentPerformance');
      
    // --- REMOVE INTERACTIVE TRANSACTION --- 
    console.log('[update-recent-performance API] Starting updateRecentPerformance function (NO TRANSACTION WRAPPER)...');
      
      let functionResult;
    try {
      // Call directly (it uses global prisma internally)
      await updateRecentPerformance(); 
      console.log('[update-recent-performance API] Direct call completed successfully');
      functionResult = 'success_direct_call';

    } catch (stepError) {
      console.error('[update-recent-performance API] ❌ Error during direct call:', stepError);
      throw stepError; // Re-throw for the outer catch block
    }
    // --- END REMOVE INTERACTIVE TRANSACTION --- 

    /* --- Original Transaction Logic (commented out) ---
      try {
        await prisma.$transaction(
          async (tx) => {
            console.log('[update-recent-performance API] Inside transaction');
          await updateRecentPerformance(tx); // This was the line causing the error
            console.log('[update-recent-performance API] Transaction completed successfully');
          },
          { timeout: 60000 } // 60 second timeout
        );
      functionResult = 'success_transaction';
      } catch (txError) {
        console.error('[update-recent-performance API] ❌ Transaction failed:', txError);
      // ... fallback logic ...
    }
    --- End Original Transaction Logic --- */
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      console.log(`[update-recent-performance API] ✓ Recent Performance updated successfully in ${executionTime}ms`);
      
      console.log('[update-recent-performance API] Responding with completion signal, completed=true');
      const responseObj = { 
        success: true, 
        message: 'Recent Performance updated successfully',
      completed: true, // Important for the run-postprocess logic if this endpoint was still somehow used
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
    
    // Maybe attempt fallback (Note: manualUpdate expects a transaction client, 
    // so calling it here might need adjustment or removal if no longer viable)
    /* 
    try {
        console.log('[update-recent-performance API] Attempting emergency fallback implementation (needs review)');
        // This call might fail as manualUpdate expects a tx client
        // await manualUpdate(prisma); // Or maybe don't fallback?
        functionResult = 'fallback_attempted';
    } catch (fallbackError) {
        console.error('[update-recent-performance API] Fallback implementation also failed:', fallbackError);
    }
    */
    
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