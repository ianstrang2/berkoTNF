import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';
import { updateAllTimeStats } from '@/lib/stats/updateAllTimeStats';
import { updateSeasonHonours } from '@/lib/stats/updateSeasonHonours';
import { updateHalfAndFullSeasonStats } from '@/lib/stats/updateHalfAndFullSeasonStats';
import { updateMatchReportCache } from '@/lib/stats/updateMatchReportCache';
import { getAppConfig } from '@/lib/config';
// import { verifyAdmin } from '@/lib/auth'; // Assuming an auth verification utility exists - COMMENTED OUT FOR NOW

// In-memory progress tracking (will reset on server restart)
let progressStatus = {
  currentStep: '',
  percentComplete: 0,
  steps: [
    'Initializing',
    'Fetching Configuration',
    'Updating Recent Performance',
    'Updating All-Time Stats',
    'Updating Season Honours',
    'Updating Half & Full Season Stats',
    'Updating Match Report Cache'
  ],
  isRunning: false,
  startTime: null as number | null,
  error: null as string | null
};

// Add GET endpoint to check progress
export async function GET() {
  return NextResponse.json(progressStatus);
}

export async function POST(request: Request) {
  // Optional: Verify if the request comes from an admin or a trusted source
  // const isAdmin = typeof verifyAdmin === 'function' ? verifyAdmin(request) : true; // Basic check if function exists
  // if (!isAdmin) { 
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // If already running, return status
  if (progressStatus.isRunning) {
    return NextResponse.json({ 
      success: false, 
      error: 'Process already running', 
      progress: progressStatus 
    });
  }
  
  // Reset progress
  progressStatus = {
    currentStep: 'Initializing',
    percentComplete: 0,
    steps: [
      'Initializing',
      'Fetching Configuration',
      'Updating Recent Performance',
      'Updating All-Time Stats',
      'Updating Season Honours',
      'Updating Half & Full Season Stats',
      'Updating Match Report Cache'
    ],
    isRunning: true,
    startTime: Date.now(),
    error: null
  };

  console.log('Starting match postprocessing...');
  
  try {
    console.time('Total Postprocessing Time');

    // Fetch application configuration
    progressStatus.currentStep = 'Fetching Configuration';
    progressStatus.percentComplete = 5;
    const config = await getAppConfig();

    /* 
     * TODO: Future Enhancement - Transaction Support
     * Currently, each function manages its own database operations.
     * In the future, these functions should be refactored to accept a transaction client
     * so they can all be executed within a single database transaction for atomicity.
     * 
     * Example:
     * await prisma.$transaction(async (tx) => {
     *   await updateRecentPerformance(tx);
     *   await updateAllTimeStats(tx, config);
     *   // etc.
     * });
     */

    // Execute all stats updates within a single transaction for atomicity
    await prisma.$transaction(
      async (tx) => {
        // Update Recent Performance
        progressStatus.currentStep = 'Updating Recent Performance';
        progressStatus.percentComplete = 20;
        await updateRecentPerformance(tx);
        
        // Update All-Time Stats
        progressStatus.currentStep = 'Updating All-Time Stats';
        progressStatus.percentComplete = 40;
        await updateAllTimeStats(tx, config);
        
        // Update Season Honours
        progressStatus.currentStep = 'Updating Season Honours';
        progressStatus.percentComplete = 60;
        await updateSeasonHonours(tx, config);
        
        // Update Half & Full Season Stats
        progressStatus.currentStep = 'Updating Half & Full Season Stats';
        progressStatus.percentComplete = 80;
        await updateHalfAndFullSeasonStats(tx, config);
        
        // Update Match Report Cache
        progressStatus.currentStep = 'Updating Match Report Cache';
        progressStatus.percentComplete = 95;
        await updateMatchReportCache(tx);
      },
      {
        timeout: 120000 // Increase timeout to 120 seconds (2 minutes)
      }
    );

    console.timeEnd('Total Postprocessing Time');
    console.log('Match postprocessing completed successfully.');
    
    // Set final progress
    progressStatus.currentStep = 'Complete';
    progressStatus.percentComplete = 100;
    progressStatus.isRunning = false;
    
    return NextResponse.json({ success: true, message: 'Postprocessing complete.' });
  } catch (error: any) {
    console.error('[Postprocess Error]', error);
    
    // Record error in progress
    progressStatus.error = error.message;
    progressStatus.isRunning = false;
    
    return NextResponse.json(
      { success: false, error: 'Postprocessing failed', details: error.message },
      { status: 500 }
    );
  }
} 