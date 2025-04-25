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
let progressStatus = {
  currentStep: '',
  percentComplete: 0,
  steps: PROCESS_STEPS.map(step => step.name),
  isRunning: false,
  startTime: null as number | string | null,
  error: null as string | null,
  completedSteps: [] as string[]
};

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
export async function GET() {
  return NextResponse.json({
    ...progressStatus,
    // Always include computed percentComplete to ensure consistency
    percentComplete: calculateProgress()
  });
}

// Trigger a step by its ID
async function triggerStep(stepId: string, config: any) {
  const step = PROCESS_STEPS.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  // Update progress status
  progressStatus.currentStep = step.name;
  
  // Make actual API call to the step's endpoint
  // Get the base URL from environment variables or from request headers
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  // If running server-side and no base URL set, use relative URL path
  // This works in both development and production
  if (!baseUrl) {
    // Use relative URL instead of localhost
    // This works in both environments without hardcoding
    baseUrl = '';
    console.log(`No NEXT_PUBLIC_BASE_URL set, using relative URLs for internal API calls`);
  }
  
  console.log(`Triggering step ${step.name} with endpoint: ${baseUrl}${step.endpoint}`);
  
  const response = await fetch(`${baseUrl}${step.endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ config }) // Ensure config is passed as expected
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Step ${step.name} failed with status ${response.status}:`, errorData);
    throw new Error(`Step ${step.name} failed: ${errorData}`);
  }
  
  // Mark step as completed
  progressStatus.completedSteps.push(step.id);
  
  // Update overall progress
  progressStatus.percentComplete = calculateProgress();
  
  return response.json();
}

// Process the next step in the chain
async function processNextStep(config: any) {
  const completedIds = progressStatus.completedSteps;
  const nextStep = PROCESS_STEPS.find(step => !completedIds.includes(step.id));
  
  if (!nextStep) {
    // All steps are complete!
    progressStatus.percentComplete = 100;
    progressStatus.currentStep = 'Complete';
    progressStatus.isRunning = false;
    return { success: true, message: 'All steps completed successfully' };
  }
  
  // Skip steps that don't have an endpoint (they're handled manually in the main function)
  if (!nextStep.endpoint) {
    // These steps should already be completed by the main function
    console.warn(`Step ${nextStep.id} has no endpoint but wasn't marked as completed`);
    progressStatus.completedSteps.push(nextStep.id);
    return processNextStep(config);
  }
  
  try {
    // Trigger the next step
    await triggerStep(nextStep.id, config);
    
    // Process the next step in the chain
    return await processNextStep(config);
  } catch (error) {
    console.error(`Error in step ${nextStep.name}:`, error);
    progressStatus.error = error instanceof Error ? error.message : 'Unknown error';
    progressStatus.isRunning = false;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = body.config || {};

    // Don't allow starting the process if it's already running
    if (progressStatus.isRunning) {
      return NextResponse.json({ success: false, message: 'Process is already running' }, { status: 409 });
    }

    // Reset progress status
    progressStatus.isRunning = true;
    progressStatus.startTime = new Date().toISOString();
    progressStatus.percentComplete = 0;
    progressStatus.completedSteps = [];
    progressStatus.error = null;
    progressStatus.currentStep = 'Starting...';
    
    // Start the processing chain
    processNextStep(config).catch(error => {
      console.error('Process failed:', error);
      progressStatus.isRunning = false;
      progressStatus.error = error instanceof Error ? error.message : 'Unknown error';
    });

    return NextResponse.json({
      success: true,
      message: 'Process started successfully',
      status: progressStatus
    });
  } catch (error) {
    console.error('Error starting process:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 