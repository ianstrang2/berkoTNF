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
  console.log(`[${statsFunction.name}] Calling RPC: ${statsFunction.rpcName}...`);
  const startTime = Date.now();
  
  try {
    const { error } = await supabase.rpc(statsFunction.rpcName);

    if (error) {
      console.error(`[${statsFunction.name}] Error calling RPC ${statsFunction.rpcName}:`, error);
      throw new Error(`Database function error: ${error.message}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const message = `${statsFunction.rpcName} executed successfully in ${duration}ms.`;
    console.log(`[${statsFunction.name}] ${message}`);
    
    return { 
      success: true, 
      message, 
      duration 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${statsFunction.name}] CRITICAL ERROR calling ${statsFunction.rpcName}:`, error);
    
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
  console.log(`🚀 Starting parallel processing of ${STATS_FUNCTIONS.length} stats functions...`);
  const overallStartTime = Date.now();

  // Process all functions in parallel
  const results = await Promise.all(
    STATS_FUNCTIONS.map(func => processStatsFunction(supabase, func))
  );

  // Collect all cache tags for invalidation
  const allCacheTags = STATS_FUNCTIONS.flatMap(func => func.cacheTags);

  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const totalDuration = Date.now() - overallStartTime;

  console.log(`✅ Completed processing ${results.length} functions in ${totalDuration}ms`);
  console.log(`📊 Summary: ${successful} successful, ${failed} failed`);

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
