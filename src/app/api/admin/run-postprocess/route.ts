import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppConfig } from '@/lib/config';
import { headers } from 'next/headers';

// Define our steps in sequence
const PROCESS_STEPS = [
  { 
    id: 'recent-performance',
    name: 'Updating Recent Performance',
    endpoint: '/api/admin/stats/update-recent-performance',
    weight: 20
  },
  { 
    id: 'all-time-stats',
    name: 'Updating All-Time Stats',
    endpoint: '/api/admin/stats/update-all-time-stats',
    weight: 20
  },
  { 
    id: 'season-honours',
    name: 'Updating Season Honours',
    endpoint: '/api/admin/stats/update-season-honours',
    weight: 20
  },
  { 
    id: 'season-stats',
    name: 'Updating Half & Full Season Stats',
    endpoint: '/api/admin/stats/update-half-full-season',
    weight: 20
  },
  { 
    id: 'match-report',
    name: 'Updating Match Report Cache',
    endpoint: '/api/admin/stats/update-match-report',
    weight: 20
  }
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

// Add GET endpoint to check progress
export async function GET(request: Request) {
  // Get the latest state from the database
  const dbState = await getProcessState();
  
  // Update our in-memory status based on DB state
  progressStatus.isRunning = dbState.isRunning;
  progressStatus.currentStep = dbState.currentStep;
  progressStatus.completedSteps = dbState.completedSteps;
  progressStatus.requestId = dbState.requestId;
  progressStatus.error = dbState.error;
  progressStatus.startTime = dbState.startTime;
  progressStatus.lastUpdateTime = dbState.lastUpdateTime;
  progressStatus.stepAttempts = dbState.stepAttempts;
  
  // Calculate progress percentage based on completed steps
  const progress = calculateProgress(dbState.completedSteps);
  
  // Check for potential stalled process using the DB state
  if (dbState.isRunning && dbState.lastUpdateTime) {
    const lastUpdateTime = new Date(dbState.lastUpdateTime).getTime();
    const currentTime = Date.now();
    const elapsedSinceLastUpdate = (currentTime - lastUpdateTime) / 1000; // in seconds
    
    // If no updates for over 60 seconds, consider it stalled
    if (elapsedSinceLastUpdate > 60) {
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
    
    // SERVERLESS FIX: If the process is stuck in "Starting..." step for too long, nudge it along to the first step
    // This helps with Vercel serverless functions that might terminate before proceeding to the first step
    if (dbState.isRunning && dbState.currentStep === 'Starting...' && dbState.completedSteps.length === 0 && elapsedSinceLastUpdate > 5) {
      addExecutionLog(`Process appears stuck at Starting... for ${elapsedSinceLastUpdate.toFixed(1)} seconds. Nudging to first step.`);
      
      // Find the first step
      const firstStep = PROCESS_STEPS[0];
      if (firstStep) {
        try {
          // Manually trigger the first step
          addExecutionLog(`Triggering first step: ${firstStep.name}`);
          await triggerStep(firstStep.id, {}, dbState);
          
          // Update the state to reflect that we're attempting to move forward
          await updateProcessState({
            ...dbState,
            lastUpdateTime: new Date().toISOString()
          });
          
          // Do not await the process chain - let polling handle it
          processNextStep({}, dbState).catch(error => {
            console.error(`Error continuing process after nudge: ${error}`);
          });
        } catch (error) {
          console.error(`Error nudging process to first step: ${error}`);
          // Don't fail the polling request if the nudge fails
        }
      }
    }
  }

  console.log('[run-postprocess GET] Returning current progress status:', {
    isRunning: progressStatus.isRunning,
    currentStep: progressStatus.currentStep,
    percentComplete: progress,
    completedSteps: progressStatus.completedSteps,
    requestId: progressStatus.requestId,
    error: progressStatus.error
  });

  return NextResponse.json({
    ...progressStatus,
    percentComplete: progress
  });
}

// Generate a unique request ID 
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Trigger a step by its ID with proper completion tracking
async function triggerStep(stepId: string, config: any, dbState: any) {
  const step = PROCESS_STEPS.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  // Update progress status in memory and database
  progressStatus.currentStep = step.name;
  const currentTime = new Date().toISOString();
  
  // Update the database state
  await updateProcessState({
    ...dbState,
    currentStep: step.name,
    lastUpdateTime: currentTime
  });
  
  // Track attempts for this step
  const stepAttempts = dbState.stepAttempts || {};
  stepAttempts[stepId] = (stepAttempts[stepId] || 0) + 1;
  
  // Update step attempts in database
  await updateProcessState({
    ...dbState,
    stepAttempts: stepAttempts,
    lastUpdateTime: currentTime
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
      completedSteps: completedSteps,
      lastUpdateTime: currentTime
    });
    
    // Update in-memory state too
    progressStatus.completedSteps = completedSteps;
    
    return { success: false, message: `Step ${step.name} skipped after multiple attempts` };
  }
  
  // Get the host from the environment or request headers
  // For server-side fetch in Next.js, we need a complete URL
  const headersList = headers();

  // In Vercel, we should use the deployment URL or fall back to the request's origin
  let baseUrl = '';
  
  // First try Vercel-specific environment variables
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
    addExecutionLog(`Using Vercel URL: ${baseUrl}`);
  } 
  // Then try custom environment variable
  else if (process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    addExecutionLog(`Using NEXT_PUBLIC_BASE_URL: ${baseUrl}`);
  } 
  // Then try request headers
  else {
    const origin = headersList.get('origin');
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    if (origin) {
      baseUrl = origin;
      addExecutionLog(`Using origin header: ${baseUrl}`);
    } else if (host) {
      baseUrl = `${protocol}://${host}`;
      addExecutionLog(`Using host header: ${baseUrl}`);
    } else {
      // Last resort fallback
      baseUrl = 'https://berkotnf.com';
      addExecutionLog(`Using hardcoded fallback: ${baseUrl}`);
    }
  }
  
  // Ensure baseUrl doesn't end with a slash
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  addExecutionLog(`Triggering step ${step.name} with endpoint: ${baseUrl}${step.endpoint}`);
  
  try {
    addExecutionLog(`Making fetch request to ${baseUrl}${step.endpoint}`);
    
    // Add a reasonable timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${baseUrl}${step.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': dbState.requestId || 'unknown'
      },
      body: JSON.stringify({ 
        config,
        requestId: dbState.requestId
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    addExecutionLog(`Received response from ${step.endpoint}, status: ${response.status}`);
    
    // Handle specific error cases
    if (response.status === 504) {
      throw new Error(`Gateway timeout (504) for step ${step.name} - operation took too long`);
    }
    
    if (!response.ok) {
      const errorData = await response.text();
      addExecutionLog(`Step ${step.name} failed with status ${response.status}: ${errorData}`);
      throw new Error(`Step ${step.name} failed: ${errorData}`);
    }
    
    const jsonResponse = await response.json();
    
    // Special case for update-recent-performance endpoint
    if (step.endpoint.includes('update-recent-performance')) {
      addExecutionLog(`Processing special case for update-recent-performance endpoint`);
      
      // If we receive a success message, mark it as completed
      if (jsonResponse.success) {
        addExecutionLog(`update-recent-performance returned success: ${JSON.stringify(jsonResponse)}`);
        
        // Mark step as completed in the database
        const completedSteps = [...dbState.completedSteps];
        if (!completedSteps.includes(stepId)) {
          completedSteps.push(stepId);
        }
        
        await updateProcessState({
          ...dbState,
          completedSteps: completedSteps,
          lastUpdateTime: new Date().toISOString()
        });
        
        // Update in-memory state too
        progressStatus.completedSteps = completedSteps;
        
        return { 
          ...jsonResponse,
          completed: true,
          inProgress: false 
        };
      }
    }
    
    // Check response for an "inProgress" flag which would indicate the step is still running
    if (jsonResponse.inProgress) {
      addExecutionLog(`Step ${step.name} is still in progress, will check again later`);
      // We don't mark as completed yet - will check again in the next cycle
      return jsonResponse;
    }
    
    // Look for explicit completion signal or assume complete if no inProgress flag
    const isCompleted = jsonResponse.completed === true || !jsonResponse.inProgress;
    
    if (isCompleted) {
      addExecutionLog(`Step ${step.name} reported completion`);
      
      // Mark step as completed in the database
      const completedSteps = [...dbState.completedSteps];
      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId);
      }
      
      await updateProcessState({
        ...dbState,
        completedSteps: completedSteps,
        lastUpdateTime: currentTime
      });
      
      // Update in-memory state too
      progressStatus.completedSteps = completedSteps;
      
      addExecutionLog(`Step ${step.name} completed successfully. Overall progress: ${calculateProgress(completedSteps)}%`);
    } else {
      addExecutionLog(`Step ${step.name} responded without completion signal, will check again later`);
    }
    
    return jsonResponse;
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
      
    addExecutionLog(`Error in fetch for step ${step.name}: ${errorMessage}`);
    
    // Handle abort errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout while executing step ${step.name} - operation took longer than 30 seconds`);
    }
    
    throw error;
  }
}

// Process the next step in the chain with safety mechanisms
async function processNextStep(config: any, dbState: any) {
  addExecutionLog(`Processing next step. Completed steps: ${dbState.completedSteps.join(', ')}`);
  
  const completedIds = dbState.completedSteps;
  const nextStep = PROCESS_STEPS.find(step => !completedIds.includes(step.id));
  
  if (!nextStep) {
    // All steps are complete!
    const finalState = {
      ...dbState,
      isRunning: false,
      currentStep: 'Complete',
      lastUpdateTime: new Date().toISOString()
    };
    
    // Update the database
    await updateProcessState(finalState);
    
    // Update in-memory state too
    progressStatus.isRunning = false;
    progressStatus.currentStep = 'Complete';
    progressStatus.percentComplete = 100;
    
    addExecutionLog('All steps completed successfully!');
    return { success: true, message: 'All steps completed successfully' };
  }
  
  addExecutionLog(`Next step to process: ${nextStep.id} (${nextStep.name})`);
  
  // Skip steps that don't have an endpoint (they're handled manually in the main function)
  if (!nextStep.endpoint) {
    addExecutionLog(`Step ${nextStep.id} has no endpoint but wasn't marked as completed`);
    
    // Mark as completed in the database
    const completedSteps = [...dbState.completedSteps];
    completedSteps.push(nextStep.id);
    
    await updateProcessState({
      ...dbState,
      completedSteps: completedSteps,
      lastUpdateTime: new Date().toISOString()
    });
    
    // Get updated state from database before continuing
    const updatedState = await getProcessState();
    return processNextStep(config, updatedState);
  }
  
  try {
    // SERVERLESS FIX: First update the database to show we're about to trigger this step
    // This ensures even if the function execution is terminated, we know which step we were trying to start
    await updateProcessState({
      ...dbState,
      currentStep: nextStep.name,
      lastUpdateTime: new Date().toISOString()
    });
    
    addExecutionLog(`Database updated to show we're starting step: ${nextStep.name}`);
    
    // Trigger the next step with the current DB state
    const stepResult = await triggerStep(nextStep.id, config, dbState);
    
    // Get latest state from database before proceeding
    const latestState = await getProcessState();
    
    // Check if a step completion was detected (important for Vercel environments)
    const wasStepCompleted = latestState.completedSteps.includes(nextStep.id);
    
    // Skip to the next step if this one is complete or if completion signal was received
    // But don't if the step returned inProgress flag
    if (wasStepCompleted || (!stepResult.inProgress && stepResult.completed)) {
      addExecutionLog(`Step ${nextStep.name} is complete, moving to next step`);
      // Process the next step in the chain with latest state
      return await processNextStep(config, latestState);
    } else {
      // We'll check again later
      addExecutionLog(`Step ${nextStep.name} is still processing, will reschedule check`);
      
      // SERVERLESS FIX: Make sure the database shows we're in this step
      // This is crucial in case the GET polling needs to continue the chain
      await updateProcessState({
        ...latestState,
        currentStep: nextStep.name,
        lastUpdateTime: new Date().toISOString()
      });
      
      // We need to use a webhook or external function to schedule the check
      // For now, we'll just return and rely on client polling to trigger the recheck
      return { 
        success: true, 
        message: `Step ${nextStep.name} is in progress, client will need to recheck`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
      
    addExecutionLog(`Error in step ${nextStep.name}: ${errorMessage}`);
    
    // Get fresh state from database
    const latestState = await getProcessState();
    
    // Increment retry count for this step
    const stepAttempts = latestState.stepAttempts || {};
    stepAttempts[nextStep.id] = (stepAttempts[nextStep.id] || 0) + 1;
    
    // Update attempts in the database
    await updateProcessState({
      ...latestState,
      stepAttempts: stepAttempts,
      lastUpdateTime: new Date().toISOString()
    });
    
    // If we've tried too many times, mark as error and move on
    if (stepAttempts[nextStep.id] > 3) {
      addExecutionLog(`Too many errors (${stepAttempts[nextStep.id]}) for step ${nextStep.name}, marking as completed and moving on`);
      
      // Mark as completed in the database
      const completedSteps = [...latestState.completedSteps];
      if (!completedSteps.includes(nextStep.id)) {
        completedSteps.push(nextStep.id);
      }
      
      await updateProcessState({
        ...latestState,
        completedSteps: completedSteps,
        lastUpdateTime: new Date().toISOString()
      });
      
      // Get fresh state and continue to next step
      const updatedState = await getProcessState();
      return processNextStep(config, updatedState);
    }
    
    // If we haven't exceeded max retries yet, schedule a retry
    // We're in a serverless environment, so we can't use setTimeout
    // We'll rely on the client polling to trigger the retry
    addExecutionLog(`Will retry step ${nextStep.name} when client polls again (attempt ${stepAttempts[nextStep.id]})`);
    
    return { 
      success: false, 
      message: `Step ${nextStep.name} failed but will be retried on next poll` 
    };
  }
}

// Process endpoint that runs a single step of the processing chain
// This is vital for serverless environments where functions have time limits
export async function POST(request: Request) {
  addExecutionLog('POST request received to start or continue processing');
  
  try {
    const body = await request.json();
    const config = body.config || {};
    const stepId = body.stepId; // Optional specific step to process
    
    addExecutionLog(`Request body: ${JSON.stringify({...body, config: '...'})}`);
    
    // Get the latest process state from the database
    const dbState = await getProcessState();
    
    // If continuing an existing process...
    if (dbState.isRunning && dbState.requestId) {
      addExecutionLog(`Continuing existing process with ID ${dbState.requestId}`);
      
      // If a specific step was requested
      if (stepId) {
        const step = PROCESS_STEPS.find(s => s.id === stepId);
        if (!step) {
          return NextResponse.json({ 
            success: false, 
            message: `Step ${stepId} not found` 
          }, { status: 400 });
        }
        
        addExecutionLog(`Executing specific step: ${step.name}`);
        const result = await triggerStep(stepId, config, dbState);
        
        // After step completes, trigger the next step if there is one
        const updatedState = await getProcessState();
        if (updatedState.isRunning) {
          // Don't wait for this promise to resolve - let it run in the background
          processNextStep(config, updatedState).catch(processError => {
            console.error('Error continuing process chain:', processError);
          });
        }
        
        return NextResponse.json({
          success: true,
          message: `Step ${step.name} executed`,
          status: {
            ...updatedState,
            percentComplete: calculateProgress(updatedState.completedSteps)
          }
        });
      }
      
      // Continue the process chain from the current state
      // Don't wait for this to complete - return quickly
      processNextStep(config, dbState).catch(processError => {
        console.error('Error continuing process chain:', processError);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Processing continues in background',
        status: {
          ...dbState,
          percentComplete: calculateProgress(dbState.completedSteps)
        }
      });
    }
    
    // Starting a new process...
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
    
    // Update the database
    await updateProcessState(newState);
    
    // Update in-memory state too
    progressStatus.isRunning = true;
    progressStatus.requestId = requestId;
    progressStatus.currentStep = 'Starting...';
    progressStatus.completedSteps = [];
    progressStatus.error = null;
    progressStatus.startTime = newState.startTime;
    progressStatus.lastUpdateTime = newState.lastUpdateTime;
    progressStatus.stepAttempts = {};
    
    addExecutionLog(`Starting processing chain with request ID: ${requestId}`);
    
    // Start the processing chain asynchronously
    // Don't wait for this promise to resolve
    processNextStep(config, newState).catch(processError => {
      console.error('Error starting process chain:', processError);
    });

    addExecutionLog('Returning initial success response to client');
    return NextResponse.json({
      success: true,
      message: 'Process started successfully',
      requestId: requestId,
      status: {
        ...newState,
        percentComplete: 0
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
      
    addExecutionLog(`Error starting/continuing process: ${errorMessage}`);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 