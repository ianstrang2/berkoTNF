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

// In-memory progress tracking (will reset on server restart)
// Let's add a request ID and timestamps to better track execution flow
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
  stepAttempts: {} as Record<string, number>, // Track attempts per step
  activeStepStartTime: null as number | null // Track when the current step started
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
function calculateProgress() {
  if (progressStatus.completedSteps.length === 0) {
    return 0;
  }
  
  let totalWeight = 0;
  let completedWeight = 0;
  
  PROCESS_STEPS.forEach(step => {
    totalWeight += step.weight;
    if (progressStatus.completedSteps.includes(step.id)) {
      completedWeight += step.weight;
    }
  });
  
  return Math.round((completedWeight / totalWeight) * 100);
}

// Add GET endpoint to check progress
export async function GET(request: Request) {
  const progress = calculateProgress();
  
  // Check for potential stalled process
  if (progressStatus.isRunning && progressStatus.lastUpdateTime) {
    const lastUpdateTime = new Date(progressStatus.lastUpdateTime).getTime();
    const currentTime = Date.now();
    const elapsedSinceLastUpdate = (currentTime - lastUpdateTime) / 1000; // in seconds
    
    // If no updates for over 30 seconds, consider it stalled
    if (elapsedSinceLastUpdate > 30) {
      addExecutionLog(`Process appears stalled - no updates for ${elapsedSinceLastUpdate.toFixed(1)} seconds`);
      progressStatus.error = `Process stalled: No updates for ${elapsedSinceLastUpdate.toFixed(1)} seconds`;
      progressStatus.isRunning = false;
    }
    
    // Check if current step is taking too long (2 minutes max per step)
    if (progressStatus.activeStepStartTime) {
      const stepElapsedTime = (Date.now() - progressStatus.activeStepStartTime) / 1000; // in seconds
      if (stepElapsedTime > 120) { // 2 minutes
        const currentStepId = PROCESS_STEPS.find(s => s.name === progressStatus.currentStep)?.id;
        if (currentStepId) {
          addExecutionLog(`Step ${progressStatus.currentStep} is taking too long (${stepElapsedTime.toFixed(0)} sec), considering it stalled`);
          
          // Force mark as completed and move on
          if (!progressStatus.completedSteps.includes(currentStepId)) {
            progressStatus.completedSteps.push(currentStepId);
            progressStatus.activeStepStartTime = null;
            // This will allow the next step to be processed
          }
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
async function triggerStep(stepId: string, config: any) {
  const step = PROCESS_STEPS.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  // Update progress status
  progressStatus.currentStep = step.name;
  progressStatus.activeStepStartTime = Date.now();
  
  // Track attempts for this step
  progressStatus.stepAttempts[stepId] = (progressStatus.stepAttempts[stepId] || 0) + 1;
  
  // If we've tried this step too many times, skip it
  if (progressStatus.stepAttempts[stepId] > 3) {
    addExecutionLog(`Too many attempts (${progressStatus.stepAttempts[stepId]}) for step ${step.name}, skipping`);
    progressStatus.completedSteps.push(stepId);
    progressStatus.activeStepStartTime = null;
    return { success: false, message: `Step ${step.name} skipped after multiple attempts` };
  }
  
  // Get the host from the environment or request headers
  // For server-side fetch in Next.js, we need a complete URL
  const headersList = headers();
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.NEXT_PUBLIC_BASE_URL || headersList.get('host') || 'localhost:3000';
  
  // Ensure we have a valid base URL
  const baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
  
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
        'X-Request-ID': progressStatus.requestId || 'unknown'
      },
      body: JSON.stringify({ 
        config,
        requestId: progressStatus.requestId
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
    
    // Check response for an "inProgress" flag which would indicate the step is still running
    if (jsonResponse.inProgress) {
      addExecutionLog(`Step ${step.name} is still in progress, will check again later`);
      // We don't mark as completed yet - will check again in the next cycle
      return jsonResponse;
    }
    
    // Mark step as completed
    if (!progressStatus.completedSteps.includes(stepId)) {
      progressStatus.completedSteps.push(stepId);
    }
    
    // Reset the active step time
    progressStatus.activeStepStartTime = null;
    
    // Update overall progress
    progressStatus.percentComplete = calculateProgress();
    addExecutionLog(`Step ${step.name} completed successfully. Overall progress: ${progressStatus.percentComplete}%`);
    
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
async function processNextStep(config: any) {
  addExecutionLog(`Processing next step. Completed steps: ${progressStatus.completedSteps.join(', ')}`);
  
  const completedIds = progressStatus.completedSteps;
  const nextStep = PROCESS_STEPS.find(step => !completedIds.includes(step.id));
  
  if (!nextStep) {
    // All steps are complete!
    progressStatus.percentComplete = 100;
    progressStatus.currentStep = 'Complete';
    progressStatus.isRunning = false;
    progressStatus.activeStepStartTime = null;
    addExecutionLog('All steps completed successfully!');
    return { success: true, message: 'All steps completed successfully' };
  }
  
  addExecutionLog(`Next step to process: ${nextStep.id} (${nextStep.name})`);
  
  // Skip steps that don't have an endpoint (they're handled manually in the main function)
  if (!nextStep.endpoint) {
    addExecutionLog(`Step ${nextStep.id} has no endpoint but wasn't marked as completed`);
    progressStatus.completedSteps.push(nextStep.id);
    return processNextStep(config);
  }
  
  try {
    // Trigger the next step
    const stepResult = await triggerStep(nextStep.id, config);
    
    // Skip to the next step if this one is complete
    // But don't if the step returned inProgress flag
    if (!stepResult.inProgress) {
      // Process the next step in the chain
      return await processNextStep(config);
    } else {
      // We'll check again later
      addExecutionLog(`Step ${nextStep.name} is still processing, will check again later`);
      
      // Schedule a check in 5 seconds
      setTimeout(() => {
        // Only restart processing if we're still running
        if (progressStatus.isRunning) {
          addExecutionLog(`Restarting process chain after waiting for in-progress step ${nextStep.name}`);
          processNextStep(config).catch(error => {
            const errorMessage = error instanceof Error 
              ? `${error.name}: ${error.message}` 
              : 'Unknown error';
            addExecutionLog(`Error during retry of process chain: ${errorMessage}`);
          });
        }
      }, 5000);
      
      return { 
        success: true, 
        message: `Step ${nextStep.name} is in progress, will check again later`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
      
    addExecutionLog(`Error in step ${nextStep.name}: ${errorMessage}`);
    
    // Increment retry count for this step
    progressStatus.stepAttempts[nextStep.id] = (progressStatus.stepAttempts[nextStep.id] || 0) + 1;
    
    // If we've tried too many times, mark as error and move on
    if (progressStatus.stepAttempts[nextStep.id] > 3) {
      addExecutionLog(`Too many errors (${progressStatus.stepAttempts[nextStep.id]}) for step ${nextStep.name}, marking as completed and moving on`);
      progressStatus.completedSteps.push(nextStep.id);
      
      // Continue with next step instead of failing the whole process
      return processNextStep(config);
    }
    
    // If we haven't exceeded max retries yet, leave it unmarked so we'll try again
    addExecutionLog(`Will retry step ${nextStep.name} later (attempt ${progressStatus.stepAttempts[nextStep.id]})`);
    
    // Schedule a retry
    setTimeout(() => {
      // Only restart processing if we're still running
      if (progressStatus.isRunning) {
        addExecutionLog(`Restarting process chain to retry step ${nextStep.name}`);
        processNextStep(config).catch(error => {
          const errorMessage = error instanceof Error 
            ? `${error.name}: ${error.message}` 
            : 'Unknown error';
          addExecutionLog(`Error during retry of process chain: ${errorMessage}`);
        });
      }
    }, 5000);
    
    return { 
      success: false, 
      message: `Step ${nextStep.name} failed but will be retried` 
    };
  }
}

export async function POST(request: Request) {
  addExecutionLog('POST request received to start processing');
  
  try {
    const body = await request.json();
    const config = body.config || {};
    addExecutionLog(`Request body: ${JSON.stringify(body)}`);

    // Check if process was already initiated recently
    const hasRecentProcessing = progressStatus.startTime && 
      (Date.now() - new Date(progressStatus.startTime as string).getTime() < 60000);
      
    // Don't allow starting the process if it's already running or was just started
    if (progressStatus.isRunning || hasRecentProcessing) {
      addExecutionLog(`Process is already running or was recently initiated. isRunning: ${progressStatus.isRunning}, startTime: ${progressStatus.startTime}`);
      return NextResponse.json({ 
        success: false, 
        message: 'Process is already running or was recently initiated',
        status: progressStatus
      }, { status: 409 });
    }

    // Reset progress status
    const requestId = generateRequestId();
    progressStatus.isRunning = true;
    progressStatus.startTime = new Date().toISOString();
    progressStatus.lastUpdateTime = new Date().toISOString();
    progressStatus.percentComplete = 0;
    progressStatus.completedSteps = [];
    progressStatus.error = null;
    progressStatus.currentStep = 'Starting...';
    progressStatus.requestId = requestId;
    progressStatus.executionLog = [];
    progressStatus.stepAttempts = {};
    progressStatus.activeStepStartTime = null;
    
    addExecutionLog(`Starting processing chain with request ID: ${requestId}`);
    
    // Start the processing chain asynchronously
    Promise.resolve().then(() => {
      return processNextStep(config).catch(error => {
        const errorMessage = error instanceof Error 
          ? `${error.name}: ${error.message}` 
          : 'Unknown error';
          
        addExecutionLog(`Process failed: ${errorMessage}`);
        progressStatus.isRunning = false;
        progressStatus.activeStepStartTime = null;
        progressStatus.error = error instanceof Error ? error.message : 'Unknown error';
      });
    });

    addExecutionLog('Returning initial success response to client');
    return NextResponse.json({
      success: true,
      message: 'Process started successfully',
      requestId: requestId,
      status: progressStatus
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : 'Unknown error';
      
    addExecutionLog(`Error starting process: ${errorMessage}`);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 