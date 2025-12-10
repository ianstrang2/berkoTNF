/**
 * Chat Cleanup API
 * 
 * POST /api/chat/cleanup - Clean up old chat messages
 * 
 * Called by Vercel cron job once daily.
 * Keeps only the last 1,000 messages per tenant.
 * 
 * Process:
 * 1. Get all tenants
 * 2. For each tenant, find the cutoff message (1000th most recent)
 * 3. Delete all messages older than the cutoff
 * 4. Also delete orphaned reactions (messages already deleted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cron jobs need to be public (no auth required)
// But we validate the cron secret for POST requests

const MESSAGE_LIMIT = 1000;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow requests without auth in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    return await cleanupOldMessages();
  } catch (error: any) {
    console.error('Error in chat cleanup cron:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET also supported for manual triggering
export async function GET() {
  try {
    return await cleanupOldMessages();
  } catch (error: any) {
    console.error('Error in chat cleanup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function cleanupOldMessages() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  // Get all tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('tenant_id');
  
  if (tenantsError) {
    console.error('Error fetching tenants:', tenantsError);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
  
  if (!tenants || tenants.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No tenants to process',
      deletedCount: 0
    });
  }
  
  console.log(`[CHAT CLEANUP] Processing ${tenants.length} tenant(s)`);
  
  let totalDeleted = 0;
  const results: { tenantId: string; deleted: number }[] = [];
  
  for (const tenant of tenants) {
    try {
      const deleted = await cleanupTenantMessages(supabase, tenant.tenant_id);
      totalDeleted += deleted;
      if (deleted > 0) {
        results.push({ tenantId: tenant.tenant_id, deleted });
      }
    } catch (err: any) {
      console.error(`Failed to cleanup tenant ${tenant.tenant_id}:`, err);
    }
  }
  
  console.log(`[CHAT CLEANUP] Deleted ${totalDeleted} total messages across all tenants`);
  
  return NextResponse.json({
    success: true,
    message: `Deleted ${totalDeleted} old messages`,
    deletedCount: totalDeleted,
    results
  });
}

async function cleanupTenantMessages(supabase: any, tenantId: string): Promise<number> {
  // Get the count of messages for this tenant
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  
  if (!count || count <= MESSAGE_LIMIT) {
    // No cleanup needed
    return 0;
  }
  
  const messagesToDelete = count - MESSAGE_LIMIT;
  console.log(`[CHAT CLEANUP] Tenant ${tenantId}: ${count} messages, need to delete ${messagesToDelete}`);
  
  // Get the cutoff message (the 1000th most recent)
  // We'll get the created_at of that message and delete everything before it
  const { data: cutoffMessage, error: cutoffError } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(MESSAGE_LIMIT - 1, MESSAGE_LIMIT - 1) // Get the 1000th message (0-indexed)
    .single();
  
  if (cutoffError || !cutoffMessage) {
    console.error(`Failed to find cutoff message for tenant ${tenantId}:`, cutoffError);
    return 0;
  }
  
  // Delete messages older than the cutoff
  // Note: This also deletes reactions due to CASCADE
  const { error: deleteError, count: deletedCount } = await supabase
    .from('chat_messages')
    .delete({ count: 'exact' })
    .eq('tenant_id', tenantId)
    .lt('created_at', cutoffMessage.created_at);
  
  if (deleteError) {
    console.error(`Failed to delete old messages for tenant ${tenantId}:`, deleteError);
    return 0;
  }
  
  console.log(`[CHAT CLEANUP] Tenant ${tenantId}: Deleted ${deletedCount || 0} messages`);
  return deletedCount || 0;
}

