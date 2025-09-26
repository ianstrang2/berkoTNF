import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { FeatBreakingItem } from '@/types/feat-breaking.types';
// Multi-tenant imports - ensuring match reports are tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

// Add dynamic configuration to prevent static generation
export const dynamic = 'force-dynamic';

// Define interfaces for our data structures
interface Milestone {
  name: string;
  games_played?: number;
  total_games?: number;
  total_goals?: number;
  value?: number;
}

interface Streak {
  name: string;
  streak_count: number;
  streak_type: 'win' | 'loss' | 'unbeaten' | 'winless';
}

interface GoalStreak {
  name: string;
  matches_with_goals: number;
  goals_in_streak: number;
}

interface LeaderData {
  change_type: 'new_leader' | 'tied' | 'remains' | 'overtake';
  new_leader: string;
  previous_leader?: string;
  new_leader_goals?: number;
  new_leader_points?: number;
  previous_leader_goals?: number;
  previous_leader_points?: number;
  name?: string;
  value?: number;
}

interface MatchInfo {
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers?: string;
  team_b_scorers?: string;
}

interface MatchReportCache {
  match_id: number;
  match_date: Date;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers: string | null;
  team_b_scorers: string | null;
  game_milestones: Milestone[] | null;
  goal_milestones: Milestone[] | null;
  half_season_goal_leaders: LeaderData[] | null;
  half_season_fantasy_leaders: LeaderData[] | null;
  season_goal_leaders: LeaderData[] | null;
  season_fantasy_leaders: LeaderData[] | null;
  config_values: {
    win_streak_threshold: number;
    unbeaten_streak_threshold: number;
    loss_streak_threshold: number;
    winless_streak_threshold: number;
    goal_streak_threshold: number;
  };
  on_fire_player_id: number | null;  // Keep as number since it comes from DB
  grim_reaper_player_id: number | null;  // Keep as number since it comes from DB
  feat_breaking_data: any | null;  // Raw JSON data from DB
  streaks: any[] | null;  // NEW: Streak data
  goal_streaks: any[] | null;  // NEW: Goal streak data
  last_updated?: Date;
}

interface ApiResponse {
  success: boolean;
  data?: {
    matchInfo: MatchInfo;
    gamesMilestones?: Milestone[];
    goalsMilestones?: Milestone[];
    streaks?: Streak[];
    goalStreaks?: GoalStreak[];
    halfSeasonGoalLeaders?: LeaderData[];
    halfSeasonFantasyLeaders?: LeaderData[];
    seasonGoalLeaders?: LeaderData[];
    seasonFantasyLeaders?: LeaderData[];
    on_fire_player_id?: string | null;
    grim_reaper_player_id?: string | null;
    featBreakingData?: FeatBreakingItem[];
  };
  error?: string;
}

const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

// Add validation functions
const validateStringArray = (data: any): string[] => {
  // Handle null or undefined
  if (!data) return [];
  
  // If it's already an array, map items to strings
  if (Array.isArray(data)) {
    return data.map(item => {
      // Handle case where item is an object with a name property
      if (typeof item === 'object' && item !== null && 'name' in item) {
        return String(item.name);
      }
      return String(item);
    }).filter(Boolean);
  }
  
  // If it's a string, check if it's JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'object' && item !== null && 'name' in item) {
            return String(item.name);
          }
          return String(item);
        }).filter(Boolean);
      }
      // If it's not an array after parsing, return an array with just this string
      return [data];
    } catch (e) {
      console.error('Error parsing string array:', e);
      // If it's not valid JSON, treat it as a comma-separated list
      if (data.includes(',')) {
        return data.split(',').map(s => s.trim()).filter(Boolean);
      }
      // Otherwise return an array with just this string
      return [data];
    }
  }
  
  // For objects, try to convert to string
  if (typeof data === 'object' && data !== null) {
    try {
      return [JSON.stringify(data)];
    } catch (e) {
      console.error('Error stringifying object:', e);
    }
  }
  
  return [];
};

const validateString = (data: any): string | undefined => {
  // Handle undefined or null
  if (data === undefined || data === null) return undefined;
  
  // If it's already a string, return it directly
  if (typeof data === 'string') return data;
  
  // If it's an array of objects with name and goals
  if (Array.isArray(data)) {
    const validItems = data.filter(s => s && (
      (typeof s === 'object' && 'name' in s && 'goals' in s) || 
      typeof s === 'string'
    ));
    
    if (validItems.length === 0) return undefined;
    
    return validItems
      .map(s => {
        if (typeof s === 'string') return s;
        if (typeof s === 'object' && 'name' in s && 'goals' in s) {
          const goals = parseInt(String(s.goals));
          if (goals > 1) {
            return `${s.name} (${goals})`;
          }
          return String(s.name);
        }
        return JSON.stringify(s);
      })
      .join(', ');
  }
  
  // If it's an object, try to convert to string
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data);
    } catch (e) {
      console.error('Error stringifying object:', e);
      return undefined;
    }
  }
  
  // For other types, convert to string
  return String(data);
};

const validateConfigValues = (config: any): any => {
  // Default config values
  const defaultConfig = {
    win_streak_threshold: 4,
    unbeaten_streak_threshold: 6,
    loss_streak_threshold: 4,
    winless_streak_threshold: 6,
    goal_streak_threshold: 3
  };

  if (!config) {
    console.warn('Config values missing, using defaults');
    return defaultConfig;
  }

  try {
    // If it's a string, try to parse it
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch (error) {
        console.error('Error parsing config string:', error);
        return defaultConfig;
      }
    }

    // It's already an object
    return {
      win_streak_threshold: Number(config.win_streak_threshold) || defaultConfig.win_streak_threshold,
      unbeaten_streak_threshold: Number(config.unbeaten_streak_threshold) || defaultConfig.unbeaten_streak_threshold,
      loss_streak_threshold: Number(config.loss_streak_threshold) || defaultConfig.loss_streak_threshold,
      winless_streak_threshold: Number(config.winless_streak_threshold) || defaultConfig.winless_streak_threshold,
      goal_streak_threshold: Number(config.goal_streak_threshold) || defaultConfig.goal_streak_threshold
    };
  } catch (error) {
    console.error('Error validating config values:', error);
    return defaultConfig;
  }
};

const validateMilestones = (milestones: any): Milestone[] => {
  if (!milestones) return [];
  
  try {
    // If it's a string, try to parse it
    if (typeof milestones === 'string') {
      try {
        return JSON.parse(milestones);
      } catch (error) {
        console.error('Error parsing milestones string:', error);
        return [];
      }
    }
    
    // If it's already an array, ensure each item has a value field if total_games/total_goals exists
    if (Array.isArray(milestones)) {
      return milestones.map(milestone => {
        if (milestone.name) {
          // Ensure value exists for frontend compatibility - we need total_games/total_goals/value for UI
          if (milestone.total_games && !milestone.value) {
            milestone.value = milestone.total_games;
          } else if (milestone.total_goals && !milestone.value) {
            milestone.value = milestone.total_goals;  
          }
          return milestone;
        }
        return null;
      }).filter(Boolean) as Milestone[];
    }
    
    console.warn('Unexpected milestone format:', typeof milestones);
    return [];
  } catch (error) {
    console.error('Error validating milestones:', error);
    return [];
  }
};

// Comprehensive validation for feat-breaking data with production safety
const validateFeatBreakingData = (featData: any): FeatBreakingItem[] => {
  try {
    // Handle null/undefined - return empty array as safe fallback
    if (!featData) {
      return [];
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof featData === 'string') {
      try {
        const parsed = JSON.parse(featData);
        if (!Array.isArray(parsed)) {
          console.warn('Feat breaking data is not an array after parsing:', typeof parsed);
          return [];
        }
        featData = parsed;
      } catch (parseError) {
        console.error('Error parsing feat breaking data JSON:', parseError);
        return [];
      }
    }
    
    // Ensure we have an array
    if (!Array.isArray(featData)) {
      console.warn('Feat breaking data is not an array:', typeof featData);
      return [];
    }
    
    // Validate and clean each feat item
    return featData
      .filter((feat): feat is FeatBreakingItem => {
        // Type guard: ensure required properties exist and are correct types
        if (!feat || typeof feat !== 'object') {
          return false;
        }
        
        // Check for required properties
        if (!feat.feat_type || typeof feat.feat_type !== 'string') {
          return false;
        }
        
        if (!feat.player_name || typeof feat.player_name !== 'string') {
          return false;
        }
        
        if (!feat.status || !['broken', 'equaled'].includes(feat.status)) {
          return false;
        }
        
        // Validate numeric fields
        if (typeof feat.new_value !== 'number' || isNaN(feat.new_value)) {
          return false;
        }
        
        if (typeof feat.current_record !== 'number' || isNaN(feat.current_record)) {
          return false;
        }
        
        // player_id should be a number
        if (feat.player_id && (typeof feat.player_id !== 'number' || isNaN(feat.player_id))) {
          return false;
        }
        
        return true;
      })
      .map(feat => ({
        feat_type: feat.feat_type,
        player_name: feat.player_name,
        player_id: Number(feat.player_id),
        new_value: Number(feat.new_value),
        current_record: Number(feat.current_record),
        status: feat.status as 'broken' | 'equaled'
      }))
      .slice(0, 10); // Limit to 10 items to prevent UI overload
      
  } catch (error) {
    console.error('Error validating feat breaking data:', error);
    return []; // Safe fallback
  }
};

const getMatchReportData = unstable_cache(
  async () => {
    // All of the original GET logic will be moved here
    console.log('------ START: Match Report API (cached) ------');
    
    // Multi-tenant setup - ensure match reports are tenant-scoped
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Emergency fallback data
    const emergencyResponse = {
        matchInfo: {
          match_date: new Date().toISOString(),
          team_a_score: 0,
          team_b_score: 0,
          team_a_players: [],
          team_b_players: [],
          team_a_scorers: '',
          team_b_scorers: ''
        },
        gamesMilestones: [],
        goalsMilestones: [],
        streaks: [],
        goalStreaks: []
    };

    try {
      console.log('Fetching match report from DB...');
      
      const rawMatchReport = await prisma.aggregated_match_report.findFirst({
        orderBy: {
          match_date: 'desc'
        }
      });
      
      if (!rawMatchReport) {
        console.log('No match data found in DB');
        
        // Try fallback: get the most recent match directly from matches table
        console.log('Attempting fallback: fetching latest match from matches table...');
        try {
          const fallbackMatch = await prisma.matches.findFirst({
            orderBy: { match_date: 'desc' },
            include: {
              player_matches: {
                include: {
                  players: { select: { name: true } }
                }
              }
            }
          });
          
          if (fallbackMatch) {
            console.log('Fallback match found, creating minimal match report...');
            // Create a minimal match report structure
            const teamAPlayers = fallbackMatch.player_matches
              .filter(pm => pm.team === 'A' && pm.players)
              .map(pm => pm.players!.name);
            const teamBPlayers = fallbackMatch.player_matches
              .filter(pm => pm.team === 'B' && pm.players)  
              .map(pm => pm.players!.name);
              
            return {
              matchInfo: {
                match_date: fallbackMatch.match_date.toISOString(),
                team_a_score: fallbackMatch.team_a_score,
                team_b_score: fallbackMatch.team_b_score,
                team_a_players: teamAPlayers,
                team_b_players: teamBPlayers,
                team_a_scorers: '',
                team_b_scorers: ''
              },
              gamesMilestones: [],
              goalsMilestones: [],
              streaks: [],
              goalStreaks: [],
              halfSeasonGoalLeaders: [],
              halfSeasonFantasyLeaders: [],
              seasonGoalLeaders: [],
              seasonFantasyLeaders: [],
              on_fire_player_id: null,
              grim_reaper_player_id: null,
              featBreakingData: []
            };
          }
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
        }
        
        return null;
      }

      const matchReportCache = rawMatchReport as unknown as MatchReportCache;

      console.log('Match report found, ID:', matchReportCache.match_id);
      
      try {
        const validatedTeamAPlayers = validateStringArray(matchReportCache.team_a_players);
        const validatedTeamBPlayers = validateStringArray(matchReportCache.team_b_players);
        const validatedTeamAScorers = typeof matchReportCache.team_a_scorers === 'string' ? matchReportCache.team_a_scorers : '';
        const validatedTeamBScorers = typeof matchReportCache.team_b_scorers === 'string' ? matchReportCache.team_b_scorers : '';
        
        const matchInfo: MatchInfo = {
          match_date: matchReportCache.match_date.toISOString(),
          team_a_score: Number(matchReportCache.team_a_score) || 0,
          team_b_score: Number(matchReportCache.team_b_score) || 0,
          team_a_players: validatedTeamAPlayers,
          team_b_players: validatedTeamBPlayers,
          team_a_scorers: validatedTeamAScorers,
          team_b_scorers: validatedTeamBScorers
        };
        
        const defaultConfig = {
          win_streak_threshold: 4,
          unbeaten_streak_threshold: 6,
          loss_streak_threshold: 4,
          winless_streak_threshold: 6,
          goal_streak_threshold: 3
        };
        
        const thresholds = matchReportCache.config_values 
          ? validateConfigValues(matchReportCache.config_values)
          : defaultConfig;
        
        const gamesMilestones = validateMilestones(matchReportCache.game_milestones);
        const goalsMilestones = validateMilestones(matchReportCache.goal_milestones);
        
        // Process feat-breaking data with comprehensive error handling
        const featBreakingData = validateFeatBreakingData((rawMatchReport as any).feat_breaking_data);
        
        // Current Streaks and Goal Streaks (NEW: Read from aggregated_match_report)
        // Type cast to access new columns that Prisma doesn't know about yet
        const rawData = rawMatchReport as any;
        const streaksData = rawData.streaks || [];
        const goalStreaksData = rawData.goal_streaks || [];



        // Convert streaks to the format expected by the frontend
        const formattedStreaks = streaksData.map((streak: any) => ({
          name: streak.name,
          streak_type: streak.streak_type,
          streak_count: streak.streak_count
        }));

        // Convert goal streaks to the format expected by the frontend  
        const formattedGoalStreaks = goalStreaksData.map((goalStreak: any) => ({
          name: goalStreak.name,
          matches_with_goals: goalStreak.matches_with_goals,
          goals_in_streak: goalStreak.goals_in_streak
        }));
        
        return {
          matchInfo: matchInfo,
          gamesMilestones: gamesMilestones || [],
          goalsMilestones: goalsMilestones || [],
          streaks: formattedStreaks || [],
          goalStreaks: formattedGoalStreaks || [],
          halfSeasonGoalLeaders: matchReportCache.half_season_goal_leaders || [],
          halfSeasonFantasyLeaders: matchReportCache.half_season_fantasy_leaders || [],
          seasonGoalLeaders: matchReportCache.season_goal_leaders || [],
          seasonFantasyLeaders: matchReportCache.season_fantasy_leaders || [],
          on_fire_player_id: matchReportCache.on_fire_player_id ? String(matchReportCache.on_fire_player_id) : null,
          grim_reaper_player_id: matchReportCache.grim_reaper_player_id ? String(matchReportCache.grim_reaper_player_id) : null,
          featBreakingData: featBreakingData
        };
        
      } catch (processingError) {
        console.error('Error processing match report data:', processingError);
        return {
          matchInfo: {
            match_date: matchReportCache.match_date.toISOString(),
            team_a_score: Number(matchReportCache.team_a_score) || 0,
            team_b_score: Number(matchReportCache.team_b_score) || 0,
            team_a_players: [], team_b_players: [], team_a_scorers: '', team_b_scorers: '',
          },
          gamesMilestones: [], goalsMilestones: [], streaks: [], goalStreaks: [],
          halfSeasonGoalLeaders: [], halfSeasonFantasyLeaders: [],
          seasonGoalLeaders: [], seasonFantasyLeaders: [],
          on_fire_player_id: matchReportCache.on_fire_player_id ? String(matchReportCache.on_fire_player_id) : null, 
          grim_reaper_player_id: matchReportCache.grim_reaper_player_id ? String(matchReportCache.grim_reaper_player_id) : null,
          featBreakingData: []
        };
      }
    } catch (error) {
      console.error('CRITICAL ERROR fetching match report:', error);
      return null;
    }
  },
  ['match-report-data-v3'],
  {
    tags: [CACHE_TAGS.MATCH_REPORT],
    revalidate: 3600,
  }
);

export async function GET() {
  try {
    const data = await getMatchReportData();

    if (!data) {
      return NextResponse.json({ success: false, error: 'No match data available' }, { status: 404 });
    }

    // Add cache freshness metadata
    const response = NextResponse.json({ 
      success: true, 
      data,
      meta: {
        cached_at: new Date().toISOString(),
        cache_tag: 'match_report',
        ttl_seconds: 3600
      }
    });

    // Add cache headers for debugging
    response.headers.set('X-Cache-Tag', 'match_report');
    response.headers.set('X-Cache-TTL', '3600');
    
    return response;

  } catch (error: any) {
    console.error('Failed to fetch match report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch match report', details: error.message },
      { status: 500 }
    );
  }
} 