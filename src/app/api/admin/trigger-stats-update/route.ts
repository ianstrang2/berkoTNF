import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CACHE_TAGS } from '@/lib/cache/constants';

// Define the list of Edge Functions to call and their associated cache tags
const FUNCTIONS_TO_CALL: Array<{ name: string; tag?: string; tags?: string[] }> = [
  { name: 'call-update-all-time-stats', tag: CACHE_TAGS.ALL_TIME_STATS },
  { name: 'call-update-half-and-full-season-stats', tags: [CACHE_TAGS.SEASON_STATS, CACHE_TAGS.HALF_SEASON_STATS] },
  { name: 'call-update-hall-of-fame', tag: CACHE_TAGS.HALL_OF_FAME },
  { name: 'call-update-recent-performance', tag: CACHE_TAGS.RECENT_PERFORMANCE },
  { name: 'call-update-season-honours-and-records', tag: CACHE_TAGS.HONOUR_ROLL },
  { name: 'call-update-match-report-cache', tag: CACHE_TAGS.MATCH_REPORT },
  { name: 'call-update-personal-bests', tag: CACHE_TAGS.PERSONAL_BESTS },
  { name: 'call-update-player-power-rating', tag: CACHE_TAGS.PLAYER_POWER_RATING },
  { name: 'call-update-player-profile-stats', tag: CACHE_TAGS.PLAYER_PROFILE },
  { name: 'call-update-season-race-data', tag: CACHE_TAGS.SEASON_RACE_DATA }
];

// Helper function to call the revalidation endpoint
async function revalidateCache(tag: string) {
  // Comprehensive URL construction with environment debugging
  let baseUrl: string;
  let urlSource: string;
  
  // Priority order: NEXT_PUBLIC_SITE_URL -> VERCEL_URL -> localhost fallback
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    urlSource = 'NEXT_PUBLIC_SITE_URL';
  } else if (process.env.VERCEL_URL) {
    baseUrl = process.env.VERCEL_URL;
    urlSource = 'VERCEL_URL';
  } else {
    // Log comprehensive environment info for debugging
    console.error('❌ CRITICAL: No base URL found for revalidation. Environment debug:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      isVercelEnvironment: !!process.env.VERCEL,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('VERCEL') || k.includes('URL')).sort()
    });
    baseUrl = 'http://localhost:3000'; // This will fail in production
    urlSource = 'localhost_fallback';
  }
  
  // Ensure HTTPS in production environments
  if (baseUrl && !baseUrl.startsWith('http')) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      baseUrl = `https://${baseUrl}`;
    } else {
      baseUrl = `http://${baseUrl}`;
    }
  }
  
  // Validate URL construction
  let revalidateUrl: URL;
  try {
    revalidateUrl = new URL('/api/admin/revalidate-cache', baseUrl);
  } catch (urlError) {
    console.error(`❌ INVALID URL construction for ${tag}:`, {
      baseUrl,
      urlSource,
      error: urlError instanceof Error ? urlError.message : 'Unknown error'
    });
    return { success: false, error: `Invalid URL: ${baseUrl}` };
  }
  
  console.log(`🔄 Revalidating ${tag}:`, {
    url: revalidateUrl.toString(),
    baseUrl,
    urlSource,
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
  
  // Check authorization before attempting requests
  const authToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!authToken) {
    console.error(`❌ CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY for ${tag} revalidation`);
    return { success: false, error: 'Missing authorization token' };
  }
  
  // Retry logic with exponential backoff
  let lastError: string = '';
  let lastStatus: number | null = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s max
    
    try {
      console.log(`🔄 Attempt ${attempt}/3 for ${tag} (backoff: ${backoffMs}ms)`);
      
      const fetchStart = Date.now();
      const res = await fetch(revalidateUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'User-Agent': 'Vercel-Cron-Stats-Update/1.0',
        },
        body: JSON.stringify({ cacheKey: tag }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const fetchDuration = Date.now() - fetchStart;
      lastStatus = res.status;

      if (!res.ok) {
        const errorBody = await res.text();
        const errorInfo = {
          tag,
          attempt,
          status: res.status,
          statusText: res.statusText,
          url: revalidateUrl.toString(),
          duration: fetchDuration,
          errorBody: errorBody.length > 200 ? errorBody.substring(0, 200) + '...' : errorBody
        };
        
        console.error(`❌ Revalidation failed for ${tag}:`, errorInfo);
        
        lastError = `HTTP ${res.status}: ${res.statusText}`;
        
        // Don't retry on client errors (4xx) - these are permanent
        if (res.status >= 400 && res.status < 500) {
          console.error(`❌ Permanent failure (${res.status}) for ${tag} - no retry`);
          break;
        }
        
        // Retry on 5xx server errors or network issues
        if (attempt < 3) {
          console.log(`⏰ Retrying ${tag} in ${backoffMs}ms (attempt ${attempt + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }
      
      // Success case
      console.log(`✅ Successfully revalidated ${tag}:`, {
        attempt,
        duration: fetchDuration,
        status: res.status,
        url: revalidateUrl.toString()
      });
      
      return { success: true };
      
    } catch (error) {
      const errorInfo = {
        tag,
        attempt,
        url: revalidateUrl.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'UnknownError'
      };
      
      console.error(`❌ Network error revalidating ${tag}:`, errorInfo);
      
      lastError = error instanceof Error ? error.message : 'Network error';
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = 'Request timeout (10s)';
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          lastError = 'DNS/Connection failure - check URL';
        } else if (error.message.includes('fetch failed')) {
          lastError = 'Fetch failed - likely network/URL issue';
        }
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < 3) {
        console.log(`⏰ Retrying ${tag} in ${backoffMs}ms after error (attempt ${attempt + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  return { 
    success: false, 
    error: `Failed after 3 attempts: ${lastError}${lastStatus ? ` (last status: ${lastStatus})` : ''}`
  };
}

// Main stats update logic that can be called by both GET (cron) and POST (manual)
async function triggerStatsUpdate() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const results: { function: string, status: string, revalidated?: boolean, error?: string, revalidation_error?: string }[] = [];
  let hasFailed = false;

  for (const func of FUNCTIONS_TO_CALL) {
    console.log(`Invoking Edge Function: ${func.name}`);
    
    // Add retry logic for network issues
    let attempt = 0;
    const maxAttempts = 3;
    let invokeError = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for ${func.name}`);
      
      const { error } = await supabase.functions.invoke(func.name);
      
      if (!error) {
        invokeError = null;
        break; // Success, exit retry loop
      }
      
      invokeError = error;
      console.log(`Attempt ${attempt} failed for ${func.name}:`, error);
      
      // Wait briefly before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (invokeError) {
      console.error(`All attempts failed for ${func.name}:`, invokeError);
      results.push({ 
        function: func.name, 
        status: 'failed', 
        error: String(invokeError),
        revalidated: false,
        revalidation_error: 'Skipped due to function failure'
      });
      hasFailed = true;
      continue; // Continue to next function even if one fails
    }
    
    console.log(`Successfully invoked ${func.name}. Revalidating cache...`);
    
    // Handle both single tag and multiple tags
    const tagsToRevalidate = func.tags || (func.tag ? [func.tag] : []);
    let allRevalidationSucceeded = true;
    let revalidationErrors: string[] = [];
    
    for (const tag of tagsToRevalidate) {
      const revalidationResult = await revalidateCache(tag);
      if (!revalidationResult.success) {
        allRevalidationSucceeded = false;
        revalidationErrors.push(`${tag}: ${revalidationResult.error}`);
        hasFailed = true;
      }
    }
    
    results.push({
      function: func.name,
      status: 'success',
      revalidated: allRevalidationSucceeded,
      revalidation_error: revalidationErrors.length > 0 ? revalidationErrors.join('; ') : undefined
    });
  }

  // Generate user-friendly summary
  const functionFailures = results.filter(r => r.status === 'failed').length;
  const revalidationFailures = results.filter(r => !r.revalidated).length;
  const totalFunctions = results.length;

  if (hasFailed) {
    let userMessage = 'Stats update completed with issues:\n';
    
    if (functionFailures > 0) {
      userMessage += `• ${functionFailures}/${totalFunctions} database updates failed\n`;
    }
    
    if (revalidationFailures > 0) {
      userMessage += `• ${revalidationFailures}/${totalFunctions} cache invalidations failed\n`;
    }
    
    userMessage += '\nData may be stale until cache expires or manual refresh.';

    return NextResponse.json({
      success: false,
      message: userMessage,
      summary: {
        total_functions: totalFunctions,
        function_failures: functionFailures,
        revalidation_failures: revalidationFailures,
        failed_tags: results.filter(r => !r.revalidated).map(r => r.function)
      },
      results, // Keep detailed results for debugging
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `All ${totalFunctions} stats update functions and cache invalidations completed successfully.`,
    summary: {
      total_functions: totalFunctions,
      function_failures: 0,
      revalidation_failures: 0
    },
    results,
  });
}

// GET handler for Vercel cron jobs
export async function GET() {
  console.log('📅 Cron job triggered stats update');
  return triggerStatsUpdate();
}

// POST handler for manual admin triggers
export async function POST() {
  console.log('👤 Manual stats update triggered');
  return triggerStatsUpdate();
}