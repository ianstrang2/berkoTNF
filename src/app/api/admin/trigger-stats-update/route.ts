import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define the list of Edge Functions to call
const EDGE_FUNCTIONS_TO_CALL = [
  'call-update-all-time-stats',
  'call-update-half-and-full-season-stats',
  'call-update-hall-of-fame',
  'call-update-recent-performance',
  'call-update-season-honours-and-records',
  'call-update-match-report-cache'
];

export async function POST() {
  // Ensure Supabase environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Supabase credentials missing.' },
      { status: 500 }
    );
  }

  // Initialize Supabase client with the service role key for admin privileges
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('API Route: Starting Edge Function triggers...');

  try {
    for (const functionName of EDGE_FUNCTIONS_TO_CALL) {
      console.log(`API Route: Invoking Edge Function: ${functionName}`);
      const { error: invokeError } = await supabase.functions.invoke(functionName);

      if (invokeError) {
        console.error(`API Route: Error invoking ${functionName}:`, invokeError);
        // Stop on first error and return
        return NextResponse.json(
          { success: false, error: `Error invoking Edge Function ${functionName}: ${invokeError.message}` },
          { status: 500 }
        );
      } else {
        console.log(`API Route: Successfully invoked ${functionName}`);
      }
    }
    console.log('API Route: All Edge Functions invoked successfully.');
    return NextResponse.json({ success: true, message: 'All stats update functions triggered successfully.' });
  } catch (error) {
    console.error('API Route: General error triggering Edge Functions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: `Failed to trigger Edge Functions: ${errorMessage}` },
      { status: 500 }
    );
  }
} 