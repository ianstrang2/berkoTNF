/**
 * Comprehensive system health check for both background jobs and edge functions
 * Tests the actual systems that are currently active based on feature flags
 */

import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { shouldUseBackgroundJobs, getFeatureFlagStatus } from '@/config/feature-flags';
import { createClient } from '@supabase/supabase-js';

interface SystemHealthResponse {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  feature_flags: ReturnType<typeof getFeatureFlagStatus>;
  systems: {
    background_worker: SystemStatus;
    edge_functions: SystemStatus;
    cache_invalidation: SystemStatus;
    database: SystemStatus;
  };
  recommendations: string[];
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_tested';
  active: boolean;
  tests: TestResult[];
  overall_message: string;
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

export async function GET(request: NextRequest) {
  const referer = request.headers.get('referer');
  const isAdminRequest = referer?.includes('/admin') || referer?.includes('localhost');
  
  if (!isAdminRequest) {
    return NextResponse.json({ error: 'Admin access only' }, { status: 401 });
  }

  const startTime = Date.now();
  const healthData: SystemHealthResponse = {
    timestamp: new Date().toISOString(),
    overall_status: 'healthy',
    feature_flags: getFeatureFlagStatus(),
    systems: {
      background_worker: await testBackgroundWorkerSystem(),
      edge_functions: await testEdgeFunctionSystem(),
      cache_invalidation: await testCacheInvalidationSystem(),
      database: await testDatabaseSystem(),
    },
    recommendations: []
  };

  // Determine overall status and recommendations
  const systemStatuses = Object.values(healthData.systems).filter(s => s.active);
  const hasUnhealthy = systemStatuses.some(s => s.status === 'unhealthy');
  const hasDegraded = systemStatuses.some(s => s.status === 'degraded');

  if (hasUnhealthy) {
    healthData.overall_status = 'unhealthy';
    healthData.recommendations.push('Critical issues detected - immediate attention required');
  } else if (hasDegraded) {
    healthData.overall_status = 'degraded';
    healthData.recommendations.push('Performance issues detected - monitoring recommended');
  }

  // Add specific recommendations
  if (!healthData.systems.background_worker.active && !healthData.systems.edge_functions.active) {
    healthData.recommendations.push('No active stats processing system detected');
  }
  
  if (healthData.systems.cache_invalidation.status !== 'healthy') {
    healthData.recommendations.push('Cache invalidation issues may cause stale data');
  }

  return NextResponse.json({
    success: true,
    health: healthData,
    test_duration: Date.now() - startTime
  });
}

async function testBackgroundWorkerSystem(): Promise<SystemStatus> {
  const isActive = shouldUseBackgroundJobs('admin'); // Use admin as representative
  
  if (!isActive) {
    return {
      status: 'not_tested',
      active: false,
      tests: [{ name: 'Feature Flag Check', status: 'skip', message: 'Background jobs disabled by feature flags' }],
      overall_message: 'Background worker system disabled by feature flags'
    };
  }

  const tests: TestResult[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Test 1: Environment variables
  const hasInternalKey = !!process.env.INTERNAL_API_KEY;
  tests.push({
    name: 'Environment Variables',
    status: hasInternalKey ? 'pass' : 'fail',
    message: hasInternalKey ? 'INTERNAL_API_KEY present' : 'INTERNAL_API_KEY missing'
  });

  // Test 2: Cache invalidation endpoint
  try {
    // Use same URL resolution as background worker for consistency
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   'http://localhost:3000';
    
    const testStart = Date.now();
    const response = await fetch(`${baseUrl}/api/internal/cache/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-worker-key'}`,
      },
      body: JSON.stringify({
        tags: [CACHE_TAGS.MATCH_REPORT],
        source: 'system-health-test',
        requestId: 'health-' + Date.now()
      }),
      signal: AbortSignal.timeout(5000)
    });

    const duration = Date.now() - testStart;
    tests.push({
      name: 'Cache Invalidation Endpoint',
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? `Endpoint responsive (${duration}ms)` : `HTTP ${response.status}`,
      duration
    });

    if (!response.ok) overallStatus = 'unhealthy';
  } catch (error) {
    tests.push({
      name: 'Cache Invalidation Endpoint',
      status: 'fail',
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`
    });
    overallStatus = 'unhealthy';
  }

  // Test 3: Background job table access
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('background_job_status')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    tests.push({
      name: 'Job Status Table',
      status: error ? 'fail' : 'pass',
      message: error ? `Database error: ${error.message}` : 'Job status table accessible'
    });

    if (error) overallStatus = 'degraded';
  } catch (error) {
    tests.push({
      name: 'Job Status Table',
      status: 'fail',
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown'}`
    });
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    active: true,
    tests,
    overall_message: overallStatus === 'healthy' ? 
      'Background worker system operational' : 
      'Background worker system has issues'
  };
}

async function testEdgeFunctionSystem(): Promise<SystemStatus> {
  const isActive = !shouldUseBackgroundJobs('admin'); // Active when background jobs disabled
  
  if (!isActive) {
    return {
      status: 'not_tested',
      active: false,
      tests: [{ name: 'Feature Flag Check', status: 'skip', message: 'Edge functions not active (background jobs enabled)' }],
      overall_message: 'Edge function system on standby (background jobs active)'
    };
  }

  const tests: TestResult[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Test 1: Supabase environment
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  tests.push({
    name: 'Supabase Environment',
    status: (hasSupabaseKey && hasSupabaseUrl) ? 'pass' : 'fail',
    message: `URL: ${hasSupabaseUrl ? '✓' : '✗'}, Key: ${hasSupabaseKey ? '✓' : '✗'}`
  });

  // Test 2: Edge function connectivity (test one representative function)
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const testStart = Date.now();
    const { error } = await supabase.functions.invoke('call-update-match-report-cache');
    const duration = Date.now() - testStart;

    tests.push({
      name: 'Edge Function Connectivity',
      status: error ? 'fail' : 'pass',
      message: error ? `Function error: ${error.message}` : `Functions accessible (${duration}ms)`,
      duration
    });

    if (error) overallStatus = 'degraded';
  } catch (error) {
    tests.push({
      name: 'Edge Function Connectivity',
      status: 'fail',
      message: `Connection error: ${error instanceof Error ? error.message : 'Unknown'}`
    });
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    active: true,
    tests,
    overall_message: overallStatus === 'healthy' ? 
      'Edge function system operational' : 
      'Edge function system has issues'
  };
}

async function testCacheInvalidationSystem(): Promise<SystemStatus> {
  // Cache invalidation is always active regardless of job system
  const tests: TestResult[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Test the appropriate cache endpoint based on active system
  const useBackgroundJobs = shouldUseBackgroundJobs('admin');
  const endpoint = useBackgroundJobs ? '/api/internal/cache/invalidate' : '/api/admin/revalidate-cache';
  
  try {
    // Use same URL resolution as background worker for consistency
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   'http://localhost:3000';

    const testStart = Date.now();
    const requestBody = useBackgroundJobs ? 
      {
        tags: [CACHE_TAGS.MATCH_REPORT],
        source: 'system-health-test',
        requestId: 'health-' + Date.now()
      } : 
      { cacheKey: CACHE_TAGS.MATCH_REPORT };

    const authHeader = useBackgroundJobs ? 
      `Bearer ${process.env.INTERNAL_API_KEY || 'internal-worker-key'}` :
      `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(5000)
    });

    const duration = Date.now() - testStart;
    tests.push({
      name: `Cache Endpoint (${useBackgroundJobs ? 'Internal' : 'Admin'})`,
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? `Responsive (${duration}ms)` : `HTTP ${response.status}`,
      duration
    });

    if (!response.ok) overallStatus = 'unhealthy';
  } catch (error) {
    tests.push({
      name: 'Cache Endpoint',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    });
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    active: true,
    tests,
    overall_message: overallStatus === 'healthy' ? 
      'Cache invalidation system operational' : 
      'Cache invalidation system has issues'
  };
}

async function testDatabaseSystem(): Promise<SystemStatus> {
  const tests: TestResult[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Test 1: Basic connectivity
    const testStart = Date.now();
    const { data, error } = await supabase
      .from('cache_metadata')
      .select('cache_key')
      .limit(1);

    const duration = Date.now() - testStart;
    tests.push({
      name: 'Database Connectivity',
      status: error ? 'fail' : 'pass',
      message: error ? `Connection error: ${error.message}` : `Connected (${duration}ms)`,
      duration
    });

    if (error) overallStatus = 'unhealthy';

    // Test 2: Key tables exist
    const tables = ['players', 'matches', 'aggregated_player_profile_stats', 'aggregated_player_teammate_stats'];
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        tests.push({
          name: `Table: ${table}`,
          status: tableError ? 'fail' : 'pass',
          message: tableError ? `Error: ${tableError.message}` : 'Accessible'
        });

        if (tableError) overallStatus = 'degraded';
      } catch (err) {
        tests.push({
          name: `Table: ${table}`,
          status: 'fail',
          message: 'Table access failed'
        });
        overallStatus = 'degraded';
      }
    }

  } catch (error) {
    tests.push({
      name: 'Database Connection',
      status: 'fail',
      message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown'}`
    });
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    active: true,
    tests,
    overall_message: overallStatus === 'healthy' ? 
      'Database system operational' : 
      'Database system has issues'
  };
}
