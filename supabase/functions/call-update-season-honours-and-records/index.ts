import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- IMPORTANT: Ensure Deno permissions allow file reading ---
// You might need to add `--allow-read` flag when running/deploying locally if not using Supabase CLI deploy.

const FUNCTION_NAME = 'call-update-season-honours-and-records';
const TARGET_RPC = 'update_aggregated_season_honours_and_records'; // Specific RPC for this function

console.log(`Initializing Supabase Edge Function: ${FUNCTION_NAME}`);

// Renamed from callExecuteSql to callDatabaseFunction for consistency
async function callDatabaseFunction(supabase: SupabaseClient): Promise<{ success: boolean; message: string; error?: string }> {
  console.log(`[${FUNCTION_NAME}] Calling RPC: ${TARGET_RPC}...`);
  const startTime = Date.now();
  try {
    // Call the target RPC without parameters
    const { error } = await supabase.rpc(TARGET_RPC);

    if (error) {
      console.error(`[${FUNCTION_NAME}] Error calling RPC ${TARGET_RPC}:`, error);
      // Attempt to parse Supabase RPC error for more detail
      let dbErrorMessage = error.message;
      if (error.details) dbErrorMessage += ` | Details: ${error.details}`;
      if (error.hint) dbErrorMessage += ` | Hint: ${error.hint}`;
      throw new Error(`Database function error: ${dbErrorMessage}`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    // Adjusted success message to be consistent
    const message = `${TARGET_RPC} executed successfully in ${duration}ms.`;
    console.log(`[${FUNCTION_NAME}] ${message}`);
    return { success: true, message };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${FUNCTION_NAME}] CRITICAL ERROR calling ${TARGET_RPC}:`, error);
    // Adjusted error message to be consistent
    return { success: false, message: `Failed to execute ${TARGET_RPC}: ${errorMessage}`, error: errorMessage };
  }
}

// Standard Handler Boilerplate (CORS, Supabase client init)
serve(async (req: Request) => {
  console.log(`[${FUNCTION_NAME}] Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
        'Access-Control-Allow-Origin': '*', // Adjust in production!
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    } });
  }

  let supabase: SupabaseClient | null = null;
  try {
    // Create Supabase client with SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
    }
    supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false, // Required for Edge Functions
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    console.log(`[${FUNCTION_NAME}] Supabase client initialized.`);
  } catch (initError) {
    const errorMessage = initError instanceof Error ? initError.message : 'Unknown client init error';
    console.error(`[${FUNCTION_NAME}] Supabase client initialization error:`, initError);
    return new Response(JSON.stringify({ success: false, error: `Client init error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Execute the main logic
  let result: { success: boolean; message: string; error?: string };
  try {
    result = await callDatabaseFunction(supabase); // Updated function name here
  } catch (handlerError) {
    const errorMessage = handlerError instanceof Error ? handlerError.message : 'Unknown handler error';
    console.error(`[${FUNCTION_NAME}] Unhandled execution error:`, handlerError);
    result = { success: false, message: `Unexpected handler error: ${errorMessage}`, error: errorMessage };
  }

  // Return the result
  console.log(`[${FUNCTION_NAME}] Returning response:`, result);
  return new Response( JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

// console.log(`Edge Function ${FUNCTION_NAME} listener started.`); // Optional: Logs on function startup 