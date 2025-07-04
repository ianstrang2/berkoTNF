import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CACHE_TAGS } from '@/lib/cache/constants';

// Define the list of Edge Functions to call and their associated cache tags
const FUNCTIONS_TO_CALL = [
  { name: 'call-update-all-time-stats', tag: CACHE_TAGS.ALL_TIME_STATS },
  { name: 'call-update-half-and-full-season-stats', tag: CACHE_TAGS.SEASON_STATS },
  { name: 'call-update-half-and-full-season-stats', tag: CACHE_TAGS.HALF_SEASON_STATS },
  { name: 'call-update-hall-of-fame', tag: CACHE_TAGS.HALL_OF_FAME },
  { name: 'call-update-recent-performance', tag: CACHE_TAGS.RECENT_PERFORMANCE },
  { name: 'call-update-season-honours-and-records', tag: CACHE_TAGS.HONOUR_ROLL },
  { name: 'call-update-match-report-cache', tag: CACHE_TAGS.MATCH_REPORT },
  { name: 'call-update-personal-bests', tag: CACHE_TAGS.PERSONAL_BESTS },
  { name: 'call-update-player-power-rating', tag: CACHE_TAGS.PLAYER_POWER_RATING },
  { name: 'call-update-player-profile-stats', tag: CACHE_TAGS.PLAYER_PROFILE }
];

// Helper function to call the revalidation endpoint
async function revalidateCache(tag: string) {
  // Use localhost for development, or construct URL properly
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const revalidateUrl = new URL('/api/admin/revalidate-cache', baseUrl);
  
  try {
    const res = await fetch(revalidateUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ cacheKey: tag }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Failed to revalidate ${tag}: ${res.status} ${res.statusText}`, errorBody);
      return { success: false, error: `Failed to revalidate ${tag}` };
    }
    console.log(`Successfully revalidated cache for tag: ${tag}`);
    return { success: true };
  } catch (error) {
    console.error(`Error calling revalidation endpoint for ${tag}:`, error);
    return { success: false, error: `Error revalidating ${tag}` };
  }
}

export async function POST() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const results: { function: string, status: string, revalidated?: boolean, error?: string }[] = [];
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
      results.push({ function: func.name, status: 'failed', error: String(invokeError) });
      hasFailed = true;
      continue; // Continue to next function even if one fails
    }
    
    console.log(`Successfully invoked ${func.name}. Revalidating cache...`);
    const revalidationResult = await revalidateCache(func.tag);
    results.push({
      function: func.name,
      status: 'success',
      revalidated: revalidationResult.success,
    });
    if (!revalidationResult.success) {
      hasFailed = true;
    }


  }

  if (hasFailed) {
    return NextResponse.json({
      success: false,
      message: 'One or more stats update functions or revalidations failed.',
      results,
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'All stats update functions triggered and caches revalidated successfully.',
    results,
  });
} 