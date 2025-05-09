import { createClient } from '@supabase/supabase-js';

// List of Edge Functions to call in order
const EDGE_FUNCTIONS_TO_CALL = [
  'call-update-all-time-stats',
  'call-update-half-and-full-season-stats',
  'call-update-hall-of-fame',
  'call-update-recent-performance',
  'call-update-season-honours-and-records',
  'call-update-match-report-cache'
];

// Standard Supabase public environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client
let supabase: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('Supabase URL or Anon Key is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

export const triggerEdgeFunctions = async (): Promise<void> => {
  if (!supabase) {
    console.error('Supabase client is not initialized. Cannot trigger stat updates.');
    // Optionally, throw an error or handle this case as appropriate for your application
    throw new Error('Configuration error: Supabase client not initialized.');
  }

  console.log('Starting Edge Function triggers...');

  try {
    for (const functionName of EDGE_FUNCTIONS_TO_CALL) {
      console.log(`Invoking Edge Function: ${functionName}`);
      const { error: invokeError } = await supabase.functions.invoke(functionName);

      if (invokeError) {
        console.error(`Error invoking ${functionName}:`, invokeError);
        // Optionally, decide if you want to stop on first error or continue
        // For now, let's rethrow the error to indicate failure
        throw new Error(`Error invoking Edge Function ${functionName}: ${invokeError.message}`);
      } else {
         console.log(`Successfully invoked ${functionName}`);
      }
    }
    console.log('All Edge Functions invoked successfully.');
  } catch (error) {
    console.error('Error triggering Edge Functions:', error);
    // Re-throw the error so the caller can handle it if needed
    throw error;
  }
}; 