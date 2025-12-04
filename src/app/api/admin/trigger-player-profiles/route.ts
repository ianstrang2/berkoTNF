import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext, getCurrentTenantId } from '@/lib/tenantContext';
import { requireAdminRole } from '@/lib/auth/apiAuth';

// Main profile generation logic that can be called by both GET (cron) and POST (manual)
async function triggerProfileGeneration(tenantId: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recentDaysThreshold = parseInt(process.env.PROFILE_RECENT_DAYS_THRESHOLD || '7');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log(`🎭 Starting profile generation with ${recentDaysThreshold}-day threshold`);

  try {
    // Call the Edge Function with retry logic
    let attempt = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for generate-player-profiles (tenant: ${tenantId})`);
      
      const { data, error } = await supabase.functions.invoke('generate-player-profiles', {
        body: { 
          recent_days_threshold: recentDaysThreshold,
          tenant_id: tenantId  // Pass tenant context to edge function
        }
      });
      
      if (!error) {
        console.log('✅ Profile generation completed successfully');
        return NextResponse.json({ 
          success: true, 
          message: 'Profile generation completed',
          results: data,
          recent_days_threshold: recentDaysThreshold
        });
      }
      
      lastError = error;
      console.log(`Attempt ${attempt} failed for generate-player-profiles:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.error(`All attempts failed for generate-player-profiles:`, lastError);
    const errorMessage = lastError?.message || lastError?.toString() || 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: `Profile generation failed: ${errorMessage}`,
      recent_days_threshold: recentDaysThreshold
    }, { status: 500 });

  } catch (error) {
    return handleTenantError(error);
  }
}

// GET handler for Vercel cron jobs (no auth required - cron jobs are unauthenticated)
export async function GET() {
  // Use default tenant for cron jobs (matches trigger-stats-update pattern)
  const tenantId = getCurrentTenantId();
  console.log(`📅 Cron job triggered profile generation for tenant ${tenantId}`);
  return triggerProfileGeneration(tenantId);
}

// POST handler for manual admin triggers
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    
    console.log(`👤 Manual admin triggered profile generation for tenant ${tenantId}`);
    return triggerProfileGeneration(tenantId);
  });
}