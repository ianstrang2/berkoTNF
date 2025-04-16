import { NextResponse } from 'next/server';

// Global progress tracking by match ID
const progressByMatch: Record<string, number> = {};

// Register progress for a match
export function registerProgress(matchId: string, progress: number): void {
  progressByMatch[matchId] = progress;
}

// Clear progress for a match
export function clearProgress(matchId: string): void {
  delete progressByMatch[matchId];
}

// GET endpoint for SSE progress updates
export async function GET(request: Request) {
  // Get matchId from URL query parameters
  const url = new URL(request.url);
  const matchId = url.searchParams.get('matchId');
  
  if (!matchId) {
    return NextResponse.json(
      { success: false, error: 'Match ID is required' },
      { status: 400 }
    );
  }
  
  // Set up headers for Server-Sent Events
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
  
  // Create a new TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Initialize progress for this match if needed
  if (!progressByMatch[matchId]) {
    progressByMatch[matchId] = 0;
  }
  
  // Send initial progress
  const sendEvent = async (data: any) => {
    try {
      await writer.write(
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
      );
    } catch (error) {
      console.error('Error writing to SSE stream:', error);
    }
  };
  
  // Send initial progress
  await sendEvent({ progress: progressByMatch[matchId] || 0 });
  
  // Set up interval to send progress updates
  const intervalId = setInterval(async () => {
    // Check if the progress exists for this match
    if (matchId in progressByMatch) {
      await sendEvent({ progress: progressByMatch[matchId] });
      
      // If progress is 100%, clean up and close
      if (progressByMatch[matchId] >= 100) {
        clearInterval(intervalId);
        clearProgress(matchId);
        writer.close();
      }
    } else {
      // No progress found, send 0
      await sendEvent({ progress: 0 });
    }
  }, 300); // Update every 300ms
  
  // Set up cleanup for when the client disconnects
  request.signal.addEventListener('abort', () => {
    clearInterval(intervalId);
    writer.close();
  });
  
  // Return the readable stream
  return new Response(stream.readable, { headers });
} 