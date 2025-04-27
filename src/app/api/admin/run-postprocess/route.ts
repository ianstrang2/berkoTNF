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
  console.log('[getProcessState] Fetching state from DB...');
  try {
    const state = await prisma.$queryRaw`
      SELECT * FROM process_state WHERE id = 'stats_update' LIMIT 1
    `;
    console.log('[getProcessState] DB query successful.');
    if (state && state[0]) {
        console.log(`[getProcessState] Found existing state: isRunning=${state[0].is_running}, currentStep=${state[0].current_step}`);
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
    } else {
        console.log('[getProcessState] No existing state found, returning default.');
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
    }
  } catch (error) {
    console.error('[getProcessState] CRITICAL ERROR fetching process state:', error);
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
  console.log(`[updateProcessState] Updating DB state: isRunning=${state.isRunning}, currentStep=${state.currentStep}, error=${state.error}`);
  try {
    const queryStartTime = Date.now();
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
    const queryEndTime = Date.now();
    // Log immediately after the await completes
    console.log(`[updateProcessState] DB update successful. Query took ${queryEndTime - queryStartTime}ms.`); 
    return true;
  } catch (error) {
    // Log the actual error object
    console.error('[updateProcessState] CRITICAL ERROR updating process state:', error); 
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
  console.log(`[triggerStep] Invoked for stepId: ${stepId}`);
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
  
  addExecutionLog(`Executing step function: ${step.name}`);
  console.log(`[triggerStep] Preparing to execute function for step: ${step.name}`);

  try {
    console.log(`[triggerStep] Starting prisma.$transaction for step: ${step.name}`);
    await prisma.$transaction(
      // Let Prisma infer the type of tx
      async (tx) => { 
        console.log(`[triggerStep] Inside transaction callback for step: ${step.name}`);
        addExecutionLog(`Starting transaction for step: ${step.name}`);
        await step.func(tx, config);
        addExecutionLog(`Transaction completed for step: ${step.name}`);
        console.log(`[triggerStep] Transaction function completed for step: ${step.name}`);
      },
      { timeout: 120000 } // 120 second timeout
    );
    console.log(`[triggerStep] prisma.$transaction finished successfully for step: ${step.name}`);

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
  console.log(`[processNextStep] Invoked. Current step from input state: ${dbState.currentStep}, Completed: ${dbState.completedSteps?.join(',')}`);
  
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
  
  console.log(`[processNextStep] Next step to process: ${nextStep.name} (ID: ${nextStep.id})`);
  
  try {
    console.log(`[processNextStep] Updating state before triggering step ${nextStep.id}`);
    await updateProcessState({
      ...dbState,
      currentStep: nextStep.id,
      lastUpdateTime: new Date().toISOString()
    });
    console.log(`[processNextStep] State updated. Calling triggerStep for ${nextStep.id}`);
    
    const currentDbState = await getProcessState(); // Get fresh state before triggering
    console.log(`[processNextStep] Triggering step ${nextStep.id} with config: ${JSON.stringify(config || {})}`);
    const stepResult = await triggerStep(nextStep.id, config, currentDbState);
    console.log(`[processNextStep] triggerStep for ${nextStep.id} completed. Result success: ${stepResult?.success}, completed: ${stepResult?.completed}`);
    
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
    console.error(`[processNextStep] CRITICAL ERROR processing step ${nextStep?.id || 'unknown'}:`, error);
    
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
      error: `Error on step ${nextStep.name}: ${error.message.substring(0, 200)}`, // Store truncated error
      stepAttempts: stepAttempts,
      lastUpdateTime: new Date().toISOString()
    });
    
    // Update in-memory error state
    progressStatus.error = `Error on step ${nextStep.name}: ${error.message.substring(0, 200)}`;

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
        error: `Step ${nextStep.name} skipped after ${stepAttempts[nextStep.id]} failed attempts. Last error: ${error.message.substring(0, 150)}`, // Update error message
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
  console.log('[run-postprocess POST] Handler invoked');
  
  try {
    // --- Restore Original Logic --- 
    
    addExecutionLog('POST request received to start or continue processing');
    console.log('[run-postprocess POST] Inside try block');

    const body = await request.json();
    const config = body.config || {};
    const requestedStepId = body.stepId; // Optional specific step to process (use ID now)
    
    console.log(`[run-postprocess POST] Parsed body, requestedStepId: ${requestedStepId}`);
    addExecutionLog(`Request body: ${JSON.stringify({...body, config: '...'})}`);
    
    console.log('[run-postprocess POST] Attempting getProcessState');
    const dbState = await getProcessState();
    console.log(`[run-postprocess POST] getProcessState returned: isRunning=${dbState.isRunning}, currentStep=${dbState.currentStep}`);
    
    // --- Handling existing running process ---
    if (dbState.isRunning && dbState.requestId) {
      console.log('[run-postprocess POST] Handling existing process flow...');
      addExecutionLog(`Continuing existing process with ID ${dbState.requestId}. Current step from DB: ${dbState.currentStep}`);
       
       // If a specific step was requested to be re-run or triggered
       if (requestedStepId) {
         const step = PROCESS_STEPS.find(s => s.id === requestedStepId);
         if (!step || !step.func) {
           return NextResponse.json({ 
             success: false, 
             message: `Step ${requestedStepId} or its function not found` 
           }, { status: 400 });
         }
         
         addExecutionLog(`Executing specific step directly: ${step.name}`);
         try {
           // Trigger the specific step (don't await fully, let it run)
           triggerStep(requestedStepId, config, dbState).then(async () => {
              addExecutionLog(`Specific step ${step.name} triggered.`);
              // Optionally, trigger the next step if the main process isn't stuck
              const updatedState = await getProcessState();
              if (updatedState.isRunning && !updatedState.error) {
                 processNextStep(config, updatedState).catch(processError => {
                     console.error('Error continuing process chain after specific step trigger:', processError);
                 });
              }
           }).catch(async error => {
              console.error(`Error directly triggering step ${step.name}:`, error);
              // Update state with error if direct trigger fails
              const latestState = await getProcessState();
              await updateProcessState({
                ...latestState,
                error: `Failed to trigger step ${step.name}: ${error.message.substring(0, 150)}`,
                lastUpdateTime: new Date().toISOString()
              });
           });
           
           // Return quickly indicating the trigger attempt has started
           return NextResponse.json({
              success: true,
              message: `Attempting to execute step ${step.name}... Check status via GET.`,
           });

         } catch (triggerError) {
             // Catch sync errors from finding the step etc.
             return NextResponse.json({
                 success: false,
                 message: `Error preparing to trigger step ${step.name}: ${triggerError.message}`
             }, { status: 500 });
         }

       } else {
         // If no specific step requested, just try to continue the main process chain
         addExecutionLog('No specific step requested, ensuring process chain continues...');
         // Run fully async
         processNextStep(config, dbState).catch(processError => { 
           console.error('[run-postprocess POST] ASYNC ERROR continuing process chain:', processError);
           // Attempt to update the error state in the database
           updateProcessState({
             ...dbState, // Use the state known at the time of the POST call
             error: `Error continuing process: ${processError.message.substring(0, 150)}`,
             lastUpdateTime: new Date().toISOString()
           }).catch(updateError => console.error("Failed to update error state:", updateError));
        });
       
         // Return current status immediately
         return NextResponse.json({
             success: true,
             message: 'Processing continues in background. Check status via GET.',
             status: {
                 ...dbState,
                 percentComplete: calculateProgress(dbState.completedSteps)
             }
         });
       }
    } else {
      // --- Starting a new process ---
      console.log('[run-postprocess POST] Starting new process flow');
       // Reset process state
      const requestId = generateRequestId();
      const newState = {
        isRunning: true,
        requestId: requestId,
        currentStep: 'Starting...',
        completedSteps: [],
        error: null,
        startTime: new Date().toISOString(),
        lastUpdateTime: new Date().toISOString(),
        stepAttempts: {}
      };
      
      console.log('[run-postprocess POST] Attempting initial updateProcessState for new process');
      const updateSuccess = await updateProcessState(newState);
      if (!updateSuccess) {
          console.error('[run-postprocess POST] FAILED initial updateProcessState');
          throw new Error("Failed to initialize process state in database.");
      }
      console.log('[run-postprocess POST] Initial updateProcessState successful');
      
      // Update in-memory state too
      progressStatus = {
          ...progressStatus, // Keep existing log structure etc.
          isRunning: true,
          requestId: requestId,
          currentStep: 'Starting...',
          completedSteps: [],
          error: null,
          startTime: newState.startTime,
          lastUpdateTime: newState.lastUpdateTime,
          stepAttempts: {}
      };
      
      addExecutionLog(`Starting processing chain with request ID: ${requestId}`);
      
      // --- Revert Diagnostic await: Run fully async --- 
      console.log('[run-postprocess POST] Starting initial processNextStep call ASYNCHRONOUSLY...');
      processNextStep(config, newState).catch(async processError => {
        // Logged within the catch block now
        console.error('[run-postprocess POST] ASYNC ERROR starting initial process chain:', processError);
        // Attempt to update state with error
        const latestState = await getProcessState();
        await updateProcessState({
           ...latestState,
           isRunning: false, 
           error: `Failed initial async step: ${processError.message.substring(0, 150)}`,
           lastUpdateTime: new Date().toISOString()
         }).catch(updateError => console.error("Failed to update error state after initial async failure:", updateError));
      });
      // --- END Revert Diagnostic --- 

      addExecutionLog('Returning initial success response to client');
      console.log('[run-postprocess POST] Returning success response for new process');
      // Return the newly initialized state
      return NextResponse.json({
        success: true, 
        message: 'Process started successfully',
        requestId: requestId,
        status: {
          ...newState,
          percentComplete: 0
        }
      });
    }
    

  } catch (error) {
    console.error('[run-postprocess POST] CRITICAL TOP-LEVEL ERROR:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
    try {
        // Attempt to log error to DB state if possible, but don't rely on it
        const currentState = await getProcessState();
        if (currentState.isRunning) {
            await updateProcessState({ ...currentState, isRunning: false, error: `POST handler failed: ${errorMessage.substring(0,150)}` });
        }
    } catch (stateError) {
        console.error(`[run-postprocess POST] Failed to update state during error handling: ${stateError}`);
    }
    return NextResponse.json({
      success: false,
      message: `POST handler failed: ${errorMessage}`
    }, { status: 500 });
  }
} 