import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client'; // Import PrismaClient and Prisma for transaction type
import { prisma } from '@/lib/prisma';
import { getAppConfig } from '@/lib/config';
// Remove headers import as we won't need it for fetch
// import { headers } from 'next/headers';

// Import the actual stat update functions
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';
import { updateAllTimeStats } from '@/lib/stats/updateAllTimeStats';
import { updateSeasonHonours } from '@/lib/stats/updateSeasonHonours';
import { updateHalfAndFullSeasonStats } from '@/lib/stats/updateHalfAndFullSeasonStats';
// Comment out match report import for now as the lib file is missing
// import { updateMatchReport } from '@/lib/stats/updateMatchReport';

// Define the type for the Prisma transaction client - Simplified Omit
type PrismaTransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// Define our steps with function references
const PROCESS_STEPS = [
  { 
    id: 'recent-performance',
    name: 'Updating Recent Performance',
    // Remove endpoint, add function reference
    // endpoint: '/api/admin/stats/update-recent-performance',
    func: updateRecentPerformance,
    weight: 20
  },
  { 
    id: 'all-time-stats',
    name: 'Updating All-Time Stats',
    // endpoint: '/api/admin/stats/update-all-time-stats',
    func: updateAllTimeStats,
    weight: 20
  },
  { 
    id: 'season-honours',
    name: 'Updating Season Honours',
    // endpoint: '/api/admin/stats/update-season-honours',
    func: updateSeasonHonours,
    weight: 20
  },
  { 
    id: 'season-stats',
    name: 'Updating Half & Full Season Stats',
    // Use the corrected function name
    func: updateHalfAndFullSeasonStats,
    weight: 20
  },
  // Comment out match report step for now
  // { 
  //   id: 'match-report',
  //   name: 'Updating Match Report Cache',
  //   func: updateMatchReport, 
  //   weight: 20
  // }
];

// This is still used for logs and immediate response,
// but now we'll also store state in the database
let progressStatus = {
  currentStep: '',
  percentComplete: 0,
  steps: PROCESS_STEPS.map(step => step.name),
  isRunning: false,
  startTime: null as number | string | null,
  lastUpdateTime: null as number | string | null,
  requestId: null as string | null,
  error: null as string | null,
  completedSteps: [] as string[],
  executionLog: [] as {timestamp: string, message: string}[],
  stepAttempts: {} as Record<string, number>,
  activeStepStartTime: null as number | null
};

// Helper to add a log entry with timestamp
function addExecutionLog(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  progressStatus.executionLog.push({ timestamp, message });
  progressStatus.lastUpdateTime = timestamp;
  
  // Limit log size to prevent memory issues
  if (progressStatus.executionLog.length > 100) {
    progressStatus.executionLog.shift();
  }
}

// Helper function to calculate total progress percentage
function calculateProgress(completedSteps: string[]) {
  if (completedSteps.length === 0) {
    return 0;
  }
  
  let totalWeight = 0;
  let completedWeight = 0;
  
  PROCESS_STEPS.forEach(step => {
    totalWeight += step.weight;
    if (completedSteps.includes(step.id)) {
      completedWeight += step.weight;
    }
  });
  
  return Math.round((completedWeight / totalWeight) * 100);
}

// Get process state from database
async function getProcessState() {
  try {
    // Get the latest state - table already exists in Supabase
    const state = await prisma.$queryRaw`
      SELECT * FROM process_state WHERE id = 'stats_update' LIMIT 1
    `;
    
    if (state && state[0]) {
      // Convert database record to our state format
      return {
        isRunning: state[0].is_running,
        requestId: state[0].request_id,
        currentStep: state[0].current_step || '',
        completedSteps: state[0].completed_steps || [],
        error: state[0].error,
        startTime: state[0].start_time,
        lastUpdateTime: state[0].last_update_time,
        stepAttempts: state[0].step_attempts || {}
      };
    }
    
    // If no state exists, return default
    return {
      isRunning: false,
      requestId: null,
      currentStep: '',
      completedSteps: [],
      error: null,
      startTime: null,
      lastUpdateTime: null,
      stepAttempts: {}
    };
  } catch (error) {
    console.error('Error getting process state:', error);
    // Fall back to default state if DB read fails
    return {
      isRunning: false,
      requestId: null,
      currentStep: '',
      completedSteps: [],
      error: null,
      startTime: null,
      lastUpdateTime: null,
      stepAttempts: {}
    };
  }
}

// Update process state in database
async function updateProcessState(state: {
  isRunning: boolean;
  requestId: string | null;
  currentStep: string;
  completedSteps: string[];
  error: string | null;
  startTime: string | Date | null;
  lastUpdateTime: string | Date | null;
  stepAttempts: Record<string, any>;
}) {
  try {
    // Use upsert to create or update the state
    await prisma.$executeRaw`
      INSERT INTO process_state (
        id, is_running, request_id, current_step, completed_steps, 
        error, start_time, last_update_time, step_attempts
      ) VALUES (
        'stats_update', ${state.isRunning}, ${state.requestId}, ${state.currentStep}, 
        ${state.completedSteps}::TEXT[], ${state.error}, 
        ${state.startTime ? new Date(state.startTime) : null}, 
        ${state.lastUpdateTime ? new Date(state.lastUpdateTime) : null},
        ${JSON.stringify(state.stepAttempts)}::JSONB
      )
      ON CONFLICT (id) DO UPDATE SET
        is_running = ${state.isRunning},
        request_id = ${state.requestId},
        current_step = ${state.currentStep},
        completed_steps = ${state.completedSteps}::TEXT[],
        error = ${state.error},
        start_time = ${state.startTime ? new Date(state.startTime) : null},
        last_update_time = ${state.lastUpdateTime ? new Date(state.lastUpdateTime) : null},
        step_attempts = ${JSON.stringify(state.stepAttempts)}::JSONB
    `;
    return true;
  } catch (error) {
    console.error('Error updating process state:', error);
    return false;
  }
}

// Generate a unique request ID 
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Trigger a step by its ID with proper completion tracking
// Updated to call functions directly
async function triggerStep(stepId: string, config: any, dbState: any) {
  const step = PROCESS_STEPS.find(s => s.id === stepId);
  if (!step || !step.func) { // Check if function exists
    throw new Error(`Step ${stepId} or its function not found`);
  }
  
  // Update progress status in memory and database
  progressStatus.currentStep = stepId; // Use stepId for consistency
  const currentTime = new Date().toISOString();
  
  // Update the database state to show we are starting this step
  await updateProcessState({
    ...dbState,
    currentStep: stepId, // Use stepId
    lastUpdateTime: currentTime
  });
  
  // Track attempts for this step
  const stepAttempts = dbState.stepAttempts || {};
  stepAttempts[stepId] = (stepAttempts[stepId] || 0) + 1;
  
  // Update step attempts in database
  await updateProcessState({
    ...dbState,
    currentStep: stepId, // Keep currentStep updated
    stepAttempts: stepAttempts,
    lastUpdateTime: currentTime // Update time again
  });
  
  // If we've tried this step too many times, skip it
  if (stepAttempts[stepId] > 3) {
    addExecutionLog(`Too many attempts (${stepAttempts[stepId]}) for step ${step.name}, skipping`);
    
    // Mark as completed in the database
    const completedSteps = [...dbState.completedSteps];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }
    
    await updateProcessState({
      ...dbState,
      currentStep: stepId, // Ensure currentStep reflects the skipped step
      completedSteps: completedSteps,
      lastUpdateTime: new Date().toISOString() // Update time again
    });
    
    // Update in-memory state too
    progressStatus.completedSteps = completedSteps;
    
    return { success: true, completed: true, message: `Step ${step.name} skipped after multiple attempts` }; // Indicate completed=true so processNextStep moves on
  }
  
  // REMOVED fetch logic
  
  addExecutionLog(`Executing step function: ${step.name}`);

  try {
    // Execute the step function directly within a transaction
    await prisma.$transaction(
      // Let Prisma infer the type of tx
      async (tx) => { 
        addExecutionLog(`Starting transaction for step: ${step.name}`);
        // Pass the transaction client (tx) and config to the step function
        await step.func(tx, config);
        addExecutionLog(`Transaction completed for step: ${step.name}`);
      },
      { timeout: 120000 } // 120 second timeout
    );

    addExecutionLog(`Step ${step.name} function executed successfully.`);

    // Mark step as completed in the database
    const completedSteps = [...dbState.completedSteps];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    await updateProcessState({
      ...dbState,
      currentStep: stepId, // Keep currentStep updated
      completedSteps: completedSteps,
      lastUpdateTime: new Date().toISOString() // Update time again
    });

    // Update in-memory state too
    progressStatus.completedSteps = completedSteps;
    
    addExecutionLog(`Step ${step.name} completed successfully. Overall progress: ${calculateProgress(completedSteps)}%`);
    
    // Return a success object indicating completion
    return { success: true, completed: true };

  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error during step execution';
      
    addExecutionLog(`Error executing function for step ${step.name}: ${errorMessage}`);

    // Throw the error so processNextStep can catch it
    throw error; 
  }
}

// Process the next step in the chain with safety mechanisms
async function processNextStep(config: any, dbState: any) {
  addExecutionLog(`Processing next step. Current state: step=${dbState.currentStep}, completed=${dbState.completedSteps.join(', ')}`);
  
  const completedIds = dbState.completedSteps;
  addExecutionLog(`Looking for a step that is not in completedIds: ${JSON.stringify(completedIds)}`);
  
  // Log all steps with their completion status
  PROCESS_STEPS.forEach(step => {
    const isCompleted = completedIds.includes(step.id);
    addExecutionLog(`Step ${step.id} (${step.name}) - completed: ${isCompleted}`);
  });
  
  const nextStep = PROCESS_STEPS.find(step => !completedIds.includes(step.id));
  
  if (!nextStep) {
    // All steps are complete!
    addExecutionLog(`No next step found - all steps are completed`);
    const finalState = {
      ...dbState,
      isRunning: false,
      currentStep: 'Complete',
      error: null, // Clear any previous errors
      lastUpdateTime: new Date().toISOString()
    };
    
    // Update the database
    addExecutionLog(`Updating database with final state: isRunning=false, currentStep=Complete`);
    await updateProcessState(finalState);
    
    // Update in-memory state too
    progressStatus.isRunning = false;
    progressStatus.currentStep = 'Complete';
    progressStatus.percentComplete = 100;
    progressStatus.error = null;
    
    addExecutionLog('All steps completed successfully!');
    return { success: true, message: 'All steps completed successfully' };
  }
  
  addExecutionLog(`Next step to process: ${nextStep.id} (${nextStep.name})`);
  
  // REMOVED: Check for endpoint as we now use functions
  // if (!nextStep.endpoint) { ... }

  try {
    // SERVERLESS FIX: First update the database to show we're about to trigger this step
    await updateProcessState({
      ...dbState,
      currentStep: nextStep.id, // Update currentStep to the one we are starting
      lastUpdateTime: new Date().toISOString()
    });
    
    addExecutionLog(`Database updated to show we're starting step: ${nextStep.name} (ID: ${nextStep.id})`);
    
    // Trigger the next step with the *updated* DB state
    const currentDbState = await getProcessState(); // Get fresh state before triggering
    const stepResult = await triggerStep(nextStep.id, config, currentDbState);
    
    // Get latest state from database *after* the step attempt
    const latestState = await getProcessState();
    
    // Check if the step was actually marked completed in the database by triggerStep
    const wasStepCompleted = latestState.completedSteps.includes(nextStep.id);
    
    if (wasStepCompleted) {
        addExecutionLog(`Step ${nextStep.name} is complete based on database state, moving to next step`);
        // Process the next step in the chain recursively
        return await processNextStep(config, latestState); 
    } else {
        // This case should ideally not happen if triggerStep completes successfully
        // But if it does, or if triggerStep indicates !completed (e.g., skipped), we might need to re-evaluate
        addExecutionLog(`Step ${nextStep.name} was triggered but not marked as completed in DB. State: ${JSON.stringify(latestState)}`);
        // Check if triggerStep explicitly returned completed=true (e.g., for skipped steps)
        if (stepResult?.completed) {
             addExecutionLog(`Step ${nextStep.name} indicated completion (e.g., skipped), moving to next step`);
             return await processNextStep(config, latestState);
        } else {
            // If it wasn't completed and didn't indicate completion, rely on polling/retry
            addExecutionLog(`Step ${nextStep.name} is still processing or failed without immediate completion signal.`);
             // Update DB state just to refresh timestamp and confirm current step
             await updateProcessState({
                ...latestState,
                currentStep: nextStep.id, // Keep currentStep correct
                lastUpdateTime: new Date().toISOString()
            });
             return { 
                success: true, // Indicate the processNextStep call itself succeeded
                message: `Step ${nextStep.name} is processing or awaiting retry.`
            };
        }
    }

  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
      
    addExecutionLog(`Error processing step ${nextStep.name}: ${errorMessage}`);
    
    // Get fresh state from database
    const latestState = await getProcessState();
    
    // Increment retry count for this step (using the state *before* the failed attempt)
    // We read stepAttempts from dbState passed into this function call
    const stepAttempts = latestState.stepAttempts || {}; // Use latestState to be safe
    stepAttempts[nextStep.id] = (stepAttempts[nextStep.id] || 0) + 1;
    
    // Update attempts and error state in the database
    await updateProcessState({
      ...latestState,
      currentStep: nextStep.id, // Ensure currentStep reflects the failed step
      error: `Error on step ${nextStep.name}: ${errorMessage.substring(0, 200)}`, // Store truncated error
      stepAttempts: stepAttempts,
      lastUpdateTime: new Date().toISOString()
    });
    
    // Update in-memory error state
    progressStatus.error = `Error on step ${nextStep.name}: ${errorMessage.substring(0, 200)}`;

    // If we've tried too many times, mark as completed (to skip) and move on
    if (stepAttempts[nextStep.id] > 3) {
      addExecutionLog(`Too many errors (${stepAttempts[nextStep.id]}) for step ${nextStep.name}, marking as completed/skipped and moving on`);
      
      // Mark as completed in the database
      const completedSteps = [...latestState.completedSteps];
      if (!completedSteps.includes(nextStep.id)) {
        completedSteps.push(nextStep.id);
      }
      
      await updateProcessState({
        ...latestState, // Start from latestState again
        currentStep: nextStep.id, // Keep currentStep showing the step that failed/was skipped
        completedSteps: completedSteps,
        error: `Step ${nextStep.name} skipped after ${stepAttempts[nextStep.id]} failed attempts. Last error: ${errorMessage.substring(0, 150)}`, // Update error message
        lastUpdateTime: new Date().toISOString()
      });
      
      // Get fresh state and continue to next step
      const updatedState = await getProcessState();
      return processNextStep(config, updatedState);
    }
    
    // If we haven't exceeded max retries yet, just stop and wait for polling
    addExecutionLog(`Will retry step ${nextStep.name} when client polls again (attempt ${stepAttempts[nextStep.id]} failed)`);
    
    return { 
      success: false, // Indicate the step failed this time
      message: `Step ${nextStep.name} failed (attempt ${stepAttempts[nextStep.id]}) but will be retried on next poll` 
    };
  }
}

// Ensure GET request stall checks still work with step IDs
export async function GET(request: Request) {
  // Get the latest state from the database
  const dbState = await getProcessState();
  
  // Update our in-memory status based on DB state
  progressStatus.isRunning = dbState.isRunning;
  progressStatus.currentStep = dbState.currentStep; // This should now be the step ID
  progressStatus.completedSteps = dbState.completedSteps;
  progressStatus.requestId = dbState.requestId;
  progressStatus.error = dbState.error;
  progressStatus.startTime = dbState.startTime;
  progressStatus.lastUpdateTime = dbState.lastUpdateTime;
  progressStatus.stepAttempts = dbState.stepAttempts;
  
  // Calculate progress percentage based on completed steps
  const progress = calculateProgress(dbState.completedSteps);
  
  // Add detailed debugging
  // console.log(`[run-postprocess GET] Raw DB state: isRunning=${dbState.isRunning}, currentStep=${dbState.currentStep}, completedSteps=${JSON.stringify(dbState.completedSteps)}`);
  // console.log(`[run-postprocess GET] Calculated progress: ${progress}%, based on completedSteps: ${JSON.stringify(dbState.completedSteps)}`);
  
  // Check if the current step matches any process step ID
  const isCurrentStepValid = dbState.currentStep === 'Starting...' || 
                            dbState.currentStep === 'Complete' || 
                            PROCESS_STEPS.some(step => step.id === dbState.currentStep); // Check against step ID
  
  // console.log(`[run-postprocess GET] Current step validation: isValid=${isCurrentStepValid}, value="${dbState.currentStep}"`);
  
  // Check if any steps are missing from process tracking
  // for (const step of PROCESS_STEPS) {
  //   if (!dbState.completedSteps.includes(step.id)) {
  //     console.log(`[run-postprocess GET] Step not yet completed: ${step.id} (${step.name})`);
  //   }
  // }
  
  // Check for potential stalled process using the DB state
  if (dbState.isRunning && dbState.lastUpdateTime) {
    const lastUpdateTime = new Date(dbState.lastUpdateTime).getTime();
    const currentTime = Date.now();
    const elapsedSinceLastUpdate = (currentTime - lastUpdateTime) / 1000; // in seconds
    
    // If no updates for over a longer threshold (e.g., 180 seconds) now that steps run longer, consider it stalled
    const stallThreshold = 180; // 3 minutes
    if (elapsedSinceLastUpdate > stallThreshold) {
      addExecutionLog(`Process appears stalled - no updates for ${elapsedSinceLastUpdate.toFixed(1)} seconds`);
      // Update the state in the database
      await updateProcessState({
        ...dbState,
        isRunning: false,
        error: `Process stalled: No updates for ${elapsedSinceLastUpdate.toFixed(1)} seconds`,
        lastUpdateTime: new Date().toISOString()
      });
      
      // Update our in-memory state too
      progressStatus.isRunning = false;
      progressStatus.error = `Process stalled: No updates for ${elapsedSinceLastUpdate.toFixed(1)} seconds`;
    }
    
    // Remove the specific "force complete recent-performance" logic as direct calls should be more reliable
    // if (dbState.isRunning && 
    //     (dbState.currentStep === 'recent-performance' || dbState.currentStep === 'Updating Recent Performance') && 
    //     elapsedSinceLastUpdate > 20) { ... }

    // SERVERLESS FIX: If the process is stuck in "Starting..." step for too long, nudge it along
    if (dbState.isRunning && dbState.currentStep === 'Starting...' && dbState.completedSteps.length === 0 && elapsedSinceLastUpdate > 10) { // Increased nudge time slightly
      addExecutionLog(`Process appears stuck at Starting... for ${elapsedSinceLastUpdate.toFixed(1)} seconds. Nudging to first step.`);
      
      // Get latest state just in case
      const latestState = await getProcessState();
      if (latestState.isRunning && latestState.currentStep === 'Starting...') {
          // Trigger the process chain (don't await)
          processNextStep({}, latestState).catch(error => {
              console.error(`Error nudging process from Starting...: ${error}`);
              // Don't fail the GET request if the nudge fails
          });
      } else {
          addExecutionLog(`Process state changed before nudge could occur. Current step: ${latestState.currentStep}`);
      }
    }
  }

  // REMOVED: Redundant direct check for recent-performance stalling
  // if (dbState.isRunning && ... ) { ... }

  // console.log('[run-postprocess GET] Returning current progress status:', { ... });

  // Return the consolidated status
  return NextResponse.json({
    isRunning: progressStatus.isRunning,
    currentStep: progressStatus.currentStep, // Should be step ID or 'Starting...' or 'Complete'
    percentComplete: progress,
    steps: PROCESS_STEPS.map(step => step.name), // Keep the names for display
    startTime: progressStatus.startTime,
    lastUpdateTime: progressStatus.lastUpdateTime,
    requestId: progressStatus.requestId,
    error: progressStatus.error,
    completedSteps: progressStatus.completedSteps, // Step IDs
    executionLog: progressStatus.executionLog, // Keep logs for debugging
    stepAttempts: progressStatus.stepAttempts
  });
}

// POST function remains the same structure - initiates the process

export async function POST(request: Request) {
  // VERY EARLY LOG
  console.log('[run-postprocess POST] Minimal Handler invoked');
  
  try {
    // --- COMPLETELY COMMENT OUT ORIGINAL LOGIC FOR DIAGNOSIS ---
    /*
    addExecutionLog('POST request received to start or continue processing');
    console.log('[run-postprocess POST] Inside try block');

    const body = await request.json();
    const config = body.config || {};
    const requestedStepId = body.stepId;
    
    console.log(`[run-postprocess POST] Parsed body, requestedStepId: ${requestedStepId}`);
    addExecutionLog(`Request body: ${JSON.stringify({...body, config: '...'})}`);
    
    console.log('[run-postprocess POST] Attempting getProcessState');
    const dbState = await getProcessState();
    console.log(`[run-postprocess POST] getProcessState returned: isRunning=${dbState.isRunning}, currentStep=${dbState.currentStep}`);
    
    // --- Handling existing running process ---
    if (dbState.isRunning && dbState.requestId) {
       addExecutionLog(`Continuing existing process with ID ${dbState.requestId}. Current step from DB: ${dbState.currentStep}`);
       // ... (original logic for handling existing/specific steps) ...
       // Return placeholder for now
       console.log('[run-postprocess POST] DIAGNOSIS: Would handle existing process');
    } else {
      // --- Starting a new process ---
      addExecutionLog('No process running or previous one completed/failed. Starting a new process...');
      console.log('[run-postprocess POST] DIAGNOSIS: Would start new process');
      // ... (original logic for starting new process) ...
    }
    */
    // --- END COMMENTED OUT SECTION ---

    console.log('[run-postprocess POST] Reached end of simplified try block');
    // Immediately return a success response for diagnosis
    return NextResponse.json({ 
      success: true, 
      message: 'Diagnosis: Minimal POST handler executed.' 
    });

  } catch (error) {
    console.error('[run-postprocess POST] CRITICAL TOP-LEVEL ERROR:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
    try {
        // Attempt to log error to DB state if possible, but don't rely on it
        const currentState = await getProcessState();
        if (currentState.isRunning) {
            await updateProcessState({ ...currentState, isRunning: false, error: `Minimal POST handler failed: ${errorMessage.substring(0,150)}` });
        }
    } catch (stateError) {
        console.error(`[run-postprocess POST] Failed to update state during error handling: ${stateError}`);
    }
    return NextResponse.json({
      success: false,
      message: `Minimal POST handler failed: ${errorMessage}`
    }, { status: 500 });
  }
} 