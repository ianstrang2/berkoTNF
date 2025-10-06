import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Platform-wide statistics
    const totalTenants = await prisma.tenants.count();
    const activeTenants = await prisma.tenants.count({
      where: { is_active: true }
    });

    // Get activity breakdown (requires checking last match dates per tenant)
    const tenants = await prisma.tenants.findMany({
      select: {
        tenant_id: true,
        created_at: true
      }
    });

    let activeCount = 0;
    let recentCount = 0;
    let inactiveCount = 0;
    const now = new Date();

    for (const tenant of tenants) {
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

    // Total players across all tenants
    const totalPlayers = await prisma.players.count({
      where: { is_retired: false }
    });

    // Total matches across all tenants
    const totalMatches = await prisma.matches.count();

    // Background job statistics (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentJobs = await prisma.background_job_status.findMany({
      where: {
        created_at: { gte: last24Hours }
      },
      select: {
        status: true
      }
    });

    const jobStats = {
      total: recentJobs.length,
      completed: recentJobs.filter(j => j.status === 'completed').length,
      failed: recentJobs.filter(j => j.status === 'failed').length,
      queued: recentJobs.filter(j => j.status === 'queued').length,
      processing: recentJobs.filter(j => j.status === 'processing').length,
    };

    const successRate = jobStats.total > 0 
      ? Math.round((jobStats.completed / jobStats.total) * 100) 
      : 100;

    // Database health check
    let dbStatus = 'healthy';
    let dbResponseTimeMs = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTimeMs = Date.now() - start;
      
      if (dbResponseTimeMs > 1000) dbStatus = 'degraded';
      else if (dbResponseTimeMs > 100) dbStatus = 'healthy';
      else dbStatus = 'excellent';
    } catch (e) {
      dbStatus = 'down';
    }

    // Worker health check (based on stuck jobs)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stuckJobs = await prisma.background_job_status.count({
      where: {
        status: 'queued',
        created_at: { lt: fiveMinutesAgo }
      }
    });

    const workerStatus = stuckJobs > 0 ? 'degraded' : 'healthy';

    // Cache health (check last update times)
    const cacheMetadata = await prisma.cache_metadata.findMany({
      orderBy: { last_invalidated: 'desc' },
      take: 1
    });

    const cacheStatus = cacheMetadata.length > 0 ? 'healthy' : 'unknown';
    const cacheLastUpdated = cacheMetadata[0]?.last_invalidated || null;

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
            stuckJobs: stuckJobs
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

  } catch (error: any) {
    console.error('Error fetching system health:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch system health' },
      { status: 500 }
    );
  }
}
