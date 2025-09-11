/**
 * Shared stats processing logic extracted from edge functions
 * This replaces the duplicated boilerplate across all edge functions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { StatsFunction, ProcessingResult } from '../types/jobTypes.js';

export const STATS_FUNCTIONS: StatsFunction[] = [
  { 
    name: 'call-update-half-and-full-season-stats', 
    rpcName: 'update_half_and_full_season_stats', 
    cacheTags: ['season_stats', 'half_season_stats'] 
  },
  { 
    name: 'call-update-all-time-stats', 
    rpcName: 'update_aggregated_all_time_stats', 
    cacheTags: ['all_time_stats'] 
  },
  { 
    name: 'call-update-hall-of-fame', 
    rpcName: 'update_aggregated_hall_of_fame', 
    cacheTags: ['hall_of_fame'] 
  },
  { 
    name: 'call-update-recent-performance', 
    rpcName: 'update_aggregated_recent_performance', 
    cacheTags: ['recent_performance'] 
  },
  { 
    name: 'call-update-season-honours-and-records', 
    rpcName: 'update_aggregated_season_honours_and_records', 
    cacheTags: ['honour_roll'] 
  },
  { 
    name: 'call-update-match-report-cache', 
    rpcName: 'update_aggregated_match_report_cache', 
    cacheTags: ['match_report'] 
  },
  { 
    name: 'call-update-personal-bests', 
    rpcName: 'update_aggregated_personal_bests', 
    cacheTags: ['personal_bests'] 
  },
  { 
    name: 'call-update-player-profile-stats', 
    rpcName: 'update_aggregated_player_profile_stats', 
    cacheTags: ['player_profile_stats'] 
  },
  { 
    name: 'call-update-player-teammate-stats', 
    rpcName: 'update_aggregated_player_teammate_stats', 
    cacheTags: ['player_teammate_stats'] 
  },
  { 
    name: 'call-update-season-race-data', 
    rpcName: 'update_aggregated_season_race_data', 
    cacheTags: ['season_race_data'] 
  },
  { 
    name: 'call-update-power-ratings', 
    rpcName: 'update_power_ratings', 
    cacheTags: ['player_power_rating'] 
  }
];

export async function processStatsFunction(
  supabase: SupabaseClient,
  statsFunction: StatsFunction
): Promise<ProcessingResult> {
  const startTimestamp = new Date().toISOString();
  console.log(`[${startTimestamp}] [${statsFunction.name}] 🚀 AUDIT: Starting RPC call`);
  console.log(`[${startTimestamp}] [${statsFunction.name}] 📋 Function details:`, {
    edgeFunctionName: statsFunction.name,
    sqlRpcName: statsFunction.rpcName,
    cacheTags: statsFunction.cacheTags,
    isPlayerProfileStats: statsFunction.rpcName === 'update_aggregated_player_profile_stats'
  });
  const startTime = Date.now();
  
  try {
    console.log(`[${new Date().toISOString()}] [${statsFunction.name}] 📡 Starting RPC: ${statsFunction.rpcName}`);
    
    // Special handling for player profile stats function (now optimized with split functions)
    const isPlayerProfileStats = statsFunction.rpcName === 'update_aggregated_player_profile_stats';
    const timeoutInfo = isPlayerProfileStats 
      ? "Player profile stats (optimized with v4 split functions)"
      : "Standard RPC call";
    
    console.log(`[${new Date().toISOString()}] [${statsFunction.name}] ⏱️  ${timeoutInfo}`);
    
    const rpcStartTime = Date.now();
    const { error } = await supabase.rpc(statsFunction.rpcName, {});
    const rpcEndTime = Date.now();
    const rpcDuration = rpcEndTime - rpcStartTime;

    console.log(`[${new Date().toISOString()}] [${statsFunction.name}] ⏱️  RPC duration: ${rpcDuration}ms`);

    if (error) {
      console.error(`[${new Date().toISOString()}] [${statsFunction.name}] ❌ RPC returned error after ${rpcDuration}ms:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        duration: rpcDuration + 'ms'
      });
      throw new Error(`Database function error: ${error.message}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endTimestamp = new Date().toISOString();
    const message = `${statsFunction.rpcName} executed successfully in ${duration}ms (RPC: ${rpcDuration}ms).`;
    console.log(`[${endTimestamp}] [${statsFunction.name}] ✅ ${message}`);
    
    return { 
      success: true, 
      message, 
      duration,
      error: undefined
    };
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${errorTimestamp}] [${statsFunction.name}] 🚨 FUNCTION FAILED - CRITICAL ERROR:`);
    console.error(`[${errorTimestamp}] [${statsFunction.name}] ❌ FAILED FUNCTION: ${statsFunction.rpcName}`);
    console.error(`[${errorTimestamp}] [${statsFunction.name}] 💥 ERROR MESSAGE: ${errorMessage}`);
    console.error(`[${errorTimestamp}] [${statsFunction.name}] 📊 FAILURE DETAILS:`, {
      edgeFunctionName: statsFunction.name,
      sqlRpcName: statsFunction.rpcName,
      cacheTags: statsFunction.cacheTags,
      errorMessage: errorMessage,
      duration: Date.now() - startTime + 'ms',
      isPlayerProfileStats: statsFunction.rpcName === 'update_aggregated_player_profile_stats',
      timestamp: errorTimestamp
    });
    console.error(`[${errorTimestamp}] [${statsFunction.name}] 🔍 FULL ERROR OBJECT:`, error);
    
    return { 
      success: false, 
      message: `Failed to execute ${statsFunction.rpcName}: ${errorMessage}`, 
      error: errorMessage,
      duration: Date.now() - startTime
    };
  }
}

export async function processAllStatsFunctions(supabase: SupabaseClient): Promise<{
  results: ProcessingResult[];
  allCacheTags: string[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
  };
}> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 AUDIT: Starting parallel processing of ${STATS_FUNCTIONS.length} stats functions`);
  console.log(`[${timestamp}] 🔍 AUDIT: Supabase client status:`, {
    clientExists: !!supabase,
    hasAuth: !!supabase?.auth,
    timestamp: timestamp
  });
  console.log(`[${timestamp}] 📋 AUDIT: All functions to process:`);
  STATS_FUNCTIONS.forEach((func, index) => {
    console.log(`[${timestamp}]   ${index + 1}. ${func.name} → ${func.rpcName}`);
  });
  const overallStartTime = Date.now();

  // Process all functions in parallel
  console.log(`[${new Date().toISOString()}] ⚡ Executing all stats functions in parallel using Promise.all()`);
  const results = await Promise.all(
    STATS_FUNCTIONS.map((func, index) => {
      console.log(`[${new Date().toISOString()}] 📤 Starting function ${index + 1}/${STATS_FUNCTIONS.length}: ${func.name}`);
      return processStatsFunction(supabase, func);
    })
  );
  console.log(`[${new Date().toISOString()}] 🎯 All parallel function executions completed`);

  // Collect all cache tags for invalidation
  console.log(`[${new Date().toISOString()}] 🏷️ Collecting cache tags from all functions`);
  const allCacheTags = STATS_FUNCTIONS.flatMap(func => func.cacheTags);

  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const totalDuration = Date.now() - overallStartTime;

  const summaryTime = new Date().toISOString();
  console.log(`[${summaryTime}] ✅ AUDIT: Completed processing ${results.length} functions in ${totalDuration}ms`);
  console.log(`[${summaryTime}] 📊 AUDIT: Summary: ${successful} successful, ${failed} failed`);
  
  // Log successful functions
  const successfulFunctions = results
    .map((result, index) => ({ result, func: STATS_FUNCTIONS[index] }))
    .filter(({ result, func }) => result.success && func);
  
  console.log(`[${summaryTime}] ✅ SUCCESSFUL FUNCTIONS (${successfulFunctions.length}):`);
  successfulFunctions.forEach(({ result, func }) => {
    if (func) {
      console.log(`[${summaryTime}]   ✅ ${func.rpcName} (${result.duration}ms)`);
    }
  });
  
  if (failed > 0) {
    const failedFunctions = results
      .map((result, index) => ({ result, func: STATS_FUNCTIONS[index] }))
      .filter(({ result, func }) => !result.success && func);
    
    console.error(`[${summaryTime}] ❌ FAILED FUNCTIONS (${failedFunctions.length}):`);
    failedFunctions.forEach(({ result, func }) => {
      if (func) {
        console.error(`[${summaryTime}]   ❌ ${func.rpcName}: ${result.error} (${result.duration}ms)`);
      }
    });
    
    // Special attention to player profile stats function
    const playerProfileFailed = failedFunctions.some(({ func }) => 
      func && func.rpcName === 'update_aggregated_player_profile_stats'
    );
    
    if (playerProfileFailed) {
      console.error(`[${summaryTime}] 🎯 PLAYER PROFILE STATS FUNCTION FAILED - This is the one with timeout fixes!`);
    }
  }

  return {
    results,
    allCacheTags,
    summary: {
      total: results.length,
      successful,
      failed,
      totalDuration
    }
  };
}
