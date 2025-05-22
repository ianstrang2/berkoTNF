import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define the list of Edge Functions to call
const EDGE_FUNCTIONS_TO_CALL = [
  'call-update-all-time-stats',
  'call-update-half-and-full-season-stats',
  'call-update-hall-of-fame',
  'call-update-recent-performance',
  'call-update-season-honours-and-records',
  'call-update-match-report-cache',
  'call-update-personal-bests'
];

export async function POST() {
  console.log('API Route /api/admin/trigger-stats-update invoked.');

  // Prefer SUPABASE_URL for server-side, fallback to NEXT_PUBLIC_SUPABASE_URL if not set
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Detailed logging for environment variables
  console.log(`Attempting to use Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0,20) + '...' : 'NOT FOUND'}`);
  console.log(`process.env.SUPABASE_URL is present: ${!!process.env.SUPABASE_URL}`);
  console.log(`process.env.NEXT_PUBLIC_SUPABASE_URL is present: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  
  console.log(`SUPABASE_SERVICE_ROLE_KEY is present: ${!!supabaseServiceRoleKey}`);
  if (supabaseServiceRoleKey) {
    console.log(`SUPABASE_SERVICE_ROLE_KEY length: ${supabaseServiceRoleKey.length}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY starts with: ${supabaseServiceRoleKey.substring(0, 5)}...`);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing from environment variables after checking SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Supabase credentials missing. Check SUPABASE_URL.' }, 
      { status: 500 }
    );
  }

  // Initialize Supabase client with the service role key for admin privileges
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  console.log('API Route: Supabase client initialized. Starting Edge Function triggers...');

  try {
    for (const functionName of EDGE_FUNCTIONS_TO_CALL) {
      console.log(`API Route: Invoking Edge Function: ${functionName}`);
      const { error: invokeError } = await supabase.functions.invoke(functionName);

      if (invokeError) {
        console.error(`API Route: Error invoking ${functionName}:`, invokeError);
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