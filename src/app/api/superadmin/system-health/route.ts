import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';

// Superadmin routes use service role to bypass RLS for cross-tenant queries
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Platform-wide statistics using service role
    const { count: totalTenants } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    const { count: activeTenants } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get activity breakdown (requires checking last match dates per tenant)
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('tenant_id, created_at');

    let activeCount = 0;
    let recentCount = 0;
    let inactiveCount = 0;
    const now = new Date();

    // Use service role for cross-tenant activity checks
    const { prisma } = await import('@/lib/prisma');
    
    for (const tenant of (tenants || [])) {
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.tenant_id}, false)`;
      
      const lastMatch = await prisma.matches.findFirst({
        where: { tenant_id: tenant.tenant_id },
        orderBy: { match_date: 'desc' },
        select: { match_date: true }
      });

      const lastActivityAt = lastMatch?.match_date || tenant.created_at || now;
      const daysSinceActivity = Math.floor(
        (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity <= 7) activeCount++;
      else if (daysSinceActivity <= 30) recentCount++;
      else inactiveCount++;
    }

    // Total players across all tenants (service role)
    const { count: totalPlayers } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('is_retired', false);

    // Total matches across all tenants (service role)
    const { count: totalMatches } = await supabaseAdmin
      .from('matches')
      .select('*', { count: 'exact', head: true });

    // Background job statistics (last 24 hours) - service role
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentJobs } = await supabaseAdmin
      .from('background_job_status')
      .select('status')
      .gte('created_at', last24Hours);

    const jobStats = {
      total: recentJobs?.length || 0,
      completed: recentJobs?.filter(j => j.status === 'completed').length || 0,
      failed: recentJobs?.filter(j => j.status === 'failed').length || 0,
      queued: recentJobs?.filter(j => j.status === 'queued').length || 0,
      processing: recentJobs?.filter(j => j.status === 'processing').length || 0,
    };

    const successRate = jobStats.total > 0 
      ? Math.round((jobStats.completed / jobStats.total) * 100) 
      : 100;

    // Database health check (service role)
    let dbStatus = 'healthy';
    let dbResponseTimeMs = 0;
    try {
      const start = Date.now();
      await supabaseAdmin.from('tenants').select('count', { count: 'exact', head: true });
      dbResponseTimeMs = Date.now() - start;
      
      if (dbResponseTimeMs > 1000) dbStatus = 'degraded';
      else if (dbResponseTimeMs > 100) dbStatus = 'healthy';
      else dbStatus = 'excellent';
    } catch (e) {
      dbStatus = 'down';
    }

    // Worker health check (based on stuck jobs) - service role
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: stuckJobs } = await supabaseAdmin
      .from('background_job_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')
      .lt('created_at', fiveMinutesAgo);

    const workerStatus = (stuckJobs || 0) > 0 ? 'degraded' : 'healthy';

    // Cache health - can't easily check across all tenants without RLS issues
    // Just return unknown for platform view
    const cacheStatus = 'unknown';
    const cacheLastUpdated = null;

    return NextResponse.json({
      success: true,
      data: {
        platform: {
          totalTenants,
          activeTenants,
          activityBreakdown: {
            active: activeCount,
            recent: recentCount,
            inactive: inactiveCount
          },
          totalPlayers,
          totalMatches
        },
        systemHealth: {
          database: {
            status: dbStatus,
            responseTimeMs: dbResponseTimeMs
          },
          worker: {
            status: workerStatus,
            stuckJobs: stuckJobs || 0
          },
          cache: {
            status: cacheStatus,
            lastUpdated: cacheLastUpdated
          }
        },
        backgroundJobs: jobStats,
        jobSuccessRate: successRate
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
}
