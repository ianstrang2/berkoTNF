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

    // Instead of one big transaction, we'll run each step in its own transaction
    // This way, if one step completes successfully but a later step times out,
    // we don't lose all our work
    
    try {
      // Step 1: Update Recent Performance
      progressStatus.currentStep = 'Updating Recent Performance';
      progressStatus.percentComplete = 20;
      await prisma.$transaction(
        async (tx) => {
          await updateRecentPerformance(tx);
        },
        { timeout: 60000 } // 60 second timeout
      );
      console.log('✓ Recent Performance updated successfully');
    } catch (error) {
      console.error('Error updating Recent Performance:', error);
      progressStatus.error = `Error in Recent Performance: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }
    
    try {
      // Step 2: Update All-Time Stats
      progressStatus.currentStep = 'Updating All-Time Stats';
      progressStatus.percentComplete = 40;
      await prisma.$transaction(
        async (tx) => {
          await updateAllTimeStats(tx, config);
        },
        { timeout: 60000 } // 60 second timeout
      );
      console.log('✓ All-Time Stats updated successfully');
    } catch (error) {
      console.error('Error updating All-Time Stats:', error);
      progressStatus.error = `Error in All-Time Stats: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }
    
    try {
      // Step 3: Update Season Honours
      progressStatus.currentStep = 'Updating Season Honours';
      progressStatus.percentComplete = 60;
      await prisma.$transaction(
        async (tx) => {
          await updateSeasonHonours(tx, config);
        },
        { timeout: 60000 } // 60 second timeout
      );
      console.log('✓ Season Honours updated successfully');
    } catch (error) {
      console.error('Error updating Season Honours:', error);
      progressStatus.error = `Error in Season Honours: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }
    
    try {
      // Step 4: Update Half & Full Season Stats
      progressStatus.currentStep = 'Updating Half & Full Season Stats';
      progressStatus.percentComplete = 80;
      await prisma.$transaction(
        async (tx) => {
          await updateHalfAndFullSeasonStats(tx, config);
        },
        { timeout: 60000 } // 60 second timeout
      );
      console.log('✓ Half & Full Season Stats updated successfully');
    } catch (error) {
      console.error('Error updating Half & Full Season Stats:', error);
      progressStatus.error = `Error in Half & Full Season Stats: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }
    
    try {
      // Step 5: Update Match Report Cache
      progressStatus.currentStep = 'Updating Match Report Cache';
      progressStatus.percentComplete = 95;
      await prisma.$transaction(
        async (tx) => {
          await updateMatchReportCache(tx);
        },
        { timeout: 60000 } // 60 second timeout
      );
      console.log('✓ Match Report Cache updated successfully');
    } catch (error) {
      console.error('Error updating Match Report Cache:', error);
      progressStatus.error = `Error in Match Report Cache: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw error;
    }

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
    if (!progressStatus.error) { // Only set if not already set by a specific step
      progressStatus.error = error.message;
    }
    progressStatus.isRunning = false;
    
    return NextResponse.json(
      { success: false, error: 'Postprocessing failed', details: progressStatus.error },
      { status: 500 }
    );
  }
} 