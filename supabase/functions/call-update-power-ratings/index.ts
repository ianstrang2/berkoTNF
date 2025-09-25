import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_NAME = 'call-update-power-ratings';
const TARGET_RPC = 'update_power_ratings'; // Matches the SQL function

console.log(`Initializing Supabase Edge Function: ${FUNCTION_NAME}`);

async function callDatabaseFunction(supabase: SupabaseClient, requestBody?: any): Promise<{ success: boolean; message: string; error?: string }> {
  console.log(`[${FUNCTION_NAME}] Calling RPC: ${TARGET_RPC}...`);
  
  // Extract tenant ID from request body or use default
  const tenantId = requestBody?.tenantId || '00000000-0000-0000-0000-000000000001';
  console.log(`[${FUNCTION_NAME}] Using tenant ID: ${tenantId}`);
  
  const startTime = Date.now();
  try {
    // Call RPC with tenant ID
    const { error } = await supabase.rpc(TARGET_RPC, {
      target_tenant_id: tenantId
    });

    if (error) {
      console.error(`[${FUNCTION_NAME}] Error calling RPC ${TARGET_RPC}:`, error);
      throw new Error(`Database function error: ${error.message}`);
    }
    const endTime = Date.now();
    const message = `${TARGET_RPC} executed successfully in ${endTime - startTime}ms.`;
    console.log(`[${FUNCTION_NAME}] ${message}`);
    return { success: true, message };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${FUNCTION_NAME}] CRITICAL ERROR calling ${TARGET_RPC}:`, error);
    return { success: false, message: `Failed to execute ${TARGET_RPC}: ${errorMessage}`, error: errorMessage };
  }
}

// Standard Handler Boilerplate
serve(async (req: Request) => {
  console.log(`[${FUNCTION_NAME}] Request received: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'} }); }

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars.');
    supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  } catch (initError) {
    console.error(`[${FUNCTION_NAME}] Client init error:`, initError);
    return new Response(JSON.stringify({ success: false, error: `Client init error: ${initError.message}` }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  let result: { success: boolean; message: string; error?: string };
  try {
    result = await callDatabaseFunction(supabase, requestBody);
  } catch (handlerError) {
    console.error(`[${FUNCTION_NAME}] Unhandled execution error:`, handlerError);
    result = { success: false, message: `Unexpected handler error: ${handlerError.message}`, error: handlerError.message };
  }

  return new Response( JSON.stringify(result), { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});

console.log(`Edge Function ${FUNCTION_NAME} listener started.`);