// supabase/functions/call-update-half-and-full-season-stats/index.ts
// Imports from Deno standard library and Supabase client
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'; // Standardize Deno version if needed, using 0.177.0 from reference
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define constants for the function name and the target RPC
const FUNCTION_NAME = 'call-update-half-and-full-season-stats';
const TARGET_RPC = 'update_half_and_full_season_stats'; // Specific RPC for this function

// Log initialization of the Supabase Edge Function
console.log(`Initializing Supabase Edge Function: ${FUNCTION_NAME}`);

// Async function to call the specified database RPC
async function callDatabaseFunction(supabase: SupabaseClient, requestBody?: any): Promise<{ success: boolean; message: string; error?: string }> {
  console.log(`[${FUNCTION_NAME}] Calling RPC: ${TARGET_RPC}...`);
  
  // Extract tenant ID from request body or use default
  const tenantId = requestBody?.tenantId || '00000000-0000-0000-0000-000000000001';
  console.log(`[${FUNCTION_NAME}] Using tenant ID: ${tenantId}`);
  
  const startTime = Date.now(); // Record start time for duration calculation
  try {
    // Call the target RPC with tenant ID
    const { error } = await supabase.rpc(TARGET_RPC, {
      target_tenant_id: tenantId
    });

    // Check if the RPC call resulted in an error
    if (error) {
      console.error(`[${FUNCTION_NAME}] Error calling RPC ${TARGET_RPC}:`, error);
      // Throw a new error to be caught by the outer catch block
      throw new Error(`Database function error: ${error.message}`);
    }

    // Calculate execution duration
    const endTime = Date.now();
    const duration = endTime - startTime;
    const message = `${TARGET_RPC} executed successfully in ${duration}ms.`;
    console.log(`[${FUNCTION_NAME}] ${message}`);
    return { success: true, message }; // Return success status and message

  } catch (error) {
    // Handle any errors that occurred during the RPC call
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${FUNCTION_NAME}] CRITICAL ERROR calling ${TARGET_RPC}:`, error);
    // Return failure status, message, and error details
    return { success: false, message: `Failed to execute ${TARGET_RPC}: ${errorMessage}`, error: errorMessage };
  }
}

// Standard boilerplate for serving requests
serve(async (req: Request) => {
  // Log incoming request details
  console.log(`[${FUNCTION_NAME}] Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
        'Access-Control-Allow-Origin': '*', // Adjust in production for security
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    } });
  }

  let supabase: SupabaseClient | null = null;
  let requestBody: any = {};
  
  // Parse request body if present
  try {
    if (req.method === 'POST') {
      requestBody = await req.json();
    }
  } catch (e) {
    console.log(`[${FUNCTION_NAME}] No JSON body or failed to parse, using defaults`);
  }
  
  try {
    // Retrieve Supabase URL and Service Role Key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use SERVICE_ROLE_KEY

    // Ensure environment variables are set
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
    }

    // Create a new Supabase client instance
    supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false, // Required for Edge Functions
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    console.log(`[${FUNCTION_NAME}] Supabase client initialized.`);

  } catch (initError) {
    // Handle errors during Supabase client initialization
    const errorMessage = initError instanceof Error ? initError.message : 'Unknown client init error';
    console.error(`[${FUNCTION_NAME}] Supabase client initialization error:`, initError);
    // Return an error response
    return new Response(JSON.stringify({ success: false, error: `Client init error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Execute the main database function call logic
  let result: { success: boolean; message: string; error?: string };
  try {
    result = await callDatabaseFunction(supabase, requestBody);
  } catch (handlerError) {
    // Handle any unhandled errors from the main logic
    const errorMessage = handlerError instanceof Error ? handlerError.message : 'Unknown handler error';
    console.error(`[${FUNCTION_NAME}] Unhandled execution error:`, handlerError);
    result = { success: false, message: `Unexpected handler error: ${errorMessage}`, error: errorMessage };
  }

  // Return the final result as a JSON response
  console.log(`[${FUNCTION_NAME}] Returning response:`, result);
  return new Response( JSON.stringify(result), {
    status: result.success ? 200 : 500, // Set HTTP status based on success
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

// Log that the Edge Function listener has started (optional, useful for local dev/debugging)
console.log(`Edge Function ${FUNCTION_NAME} listener started.`); 