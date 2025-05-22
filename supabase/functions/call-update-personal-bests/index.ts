import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUNCTION_NAME = 'call-update-personal-bests';
const TARGET_RPC = 'update_aggregated_personal_bests';

console.log(`Initializing Supabase Edge Function: ${FUNCTION_NAME}`);

async function callDatabaseRpc(client: SupabaseClient) {
  console.log(`[${FUNCTION_NAME}] Calling RPC: ${TARGET_RPC}...`);
  const startTime = Date.now();
  const { error } = await client.rpc(TARGET_RPC);
  const duration = Date.now() - startTime;

  if (error) {
    console.error(`[${FUNCTION_NAME}] Error calling RPC ${TARGET_RPC}:`, error);
    throw new Error(`Database function error: ${error.message}`);
  }

  console.log(`[${FUNCTION_NAME}] RPC ${TARGET_RPC} executed successfully in ${duration}ms.`);
  return { success: true, message: `${TARGET_RPC} executed successfully in ${duration}ms.` };
}

serve(async (req: Request) => {
  console.log(`[${FUNCTION_NAME}] Request received: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(`[${FUNCTION_NAME}] Missing Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).`);
      return new Response(JSON.stringify({ success: false, error: 'Server configuration error.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with service role key
    const serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    console.log(`[${FUNCTION_NAME}] Service role client initialized.`);

    // With --no-verify-jwt, we proceed directly to calling the RPC
    // Authorization is handled by the calling service (e.g., Next.js API route using service key)
    // and by the fact that the function URL should not be publicly exposed if sensitive.
    console.log(`[${FUNCTION_NAME}] Proceeding to call RPC (assuming --no-verify-jwt is used).`);
    
    const result = await callDatabaseRpc(serviceRoleClient);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown server error';
    console.error(`[${FUNCTION_NAME}] CRITICAL ERROR:`, e);
    return new Response(JSON.stringify({ success: false, error: `Critical error: ${errorMessage}` }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

console.log(`Edge Function ${FUNCTION_NAME} listener started.`); 