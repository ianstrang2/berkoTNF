import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';

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
  on_fire_player_id: number | null;
  grim_reaper_player_id: number | null;
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

const getMatchReportData = unstable_cache(
  async () => {
    // All of the original GET logic will be moved here
    console.log('------ START: Match Report API (cached) ------');
    
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
        
        let streaksCache: any[] = [];
        let goalStreaksCache: any[] = [];
        
        streaksCache = await prisma.aggregated_match_streaks.findMany({
          where: {
            OR: [
              { current_unbeaten_streak: { gte: Number(thresholds.unbeaten_streak_threshold) } },
              { current_winless_streak: { gte: Number(thresholds.winless_streak_threshold) } },
              { current_win_streak: { gte: Number(thresholds.win_streak_threshold) } },
              { current_loss_streak: { gte: Number(thresholds.loss_streak_threshold) } }
            ]
          },
          select: {
            player_id: true,
            name: true,
            current_unbeaten_streak: true,
            current_winless_streak: true,
            current_win_streak: true,
            current_loss_streak: true
          },
          orderBy: [
            { current_win_streak: 'desc' },
            { current_unbeaten_streak: 'desc' }
          ]
        });

        goalStreaksCache = await prisma.aggregated_match_streaks.findMany({
          where: {
            current_scoring_streak: { gte: Number(thresholds.goal_streak_threshold) }
          },
          select: {
            player_id: true,
            name: true,
            current_scoring_streak: true,
            goals_in_scoring_streak: true
          },
          orderBy: [
            { current_scoring_streak: 'desc' },
            { goals_in_scoring_streak: 'desc' }
          ]
        });

        const playerIdsFromAllStreaks = [
          ...streaksCache.map(s => s.player_id),
          ...goalStreaksCache.map(s => s.player_id)
        ];
        const uniquePlayerIdsFromStreaks = [...new Set(playerIdsFromAllStreaks.filter(id => id != null))];

        let playerNamesMap: Record<number, string> = {};
        if (uniquePlayerIdsFromStreaks.length > 0) {
          const playersData = await prisma.players.findMany({
            where: { player_id: { in: uniquePlayerIdsFromStreaks } },
            select: { player_id: true, name: true }
          });
          playersData.forEach(p => {
            if (p.name) {
              playerNamesMap[p.player_id] = p.name;
            }
          });
        }
        
        const processJsonField = (field: any): any[] => {
          if (!field) return [];
          if (typeof field === 'string') {
            try { return JSON.parse(field); } catch (e) { return []; }
          }
          if (Array.isArray(field)) { return field; }
          return [];
        };
        
        const extractedHalfSeasonGoalLeaders = processJsonField((rawMatchReport as any).half_season_goal_leaders);
        const extractedHalfSeasonFantasyLeaders = processJsonField((rawMatchReport as any).half_season_fantasy_leaders);
        const extractedSeasonGoalLeaders = processJsonField((rawMatchReport as any).season_goal_leaders);
        const extractedSeasonFantasyLeaders = processJsonField((rawMatchReport as any).season_fantasy_leaders);

        const formattedStreaks = streaksCache.map(streak => {
          let streakType = '';
          let streakCount = 0;

          if ((streak.current_unbeaten_streak ?? 0) >= Number(thresholds.unbeaten_streak_threshold)) {
            streakType = 'unbeaten';
            streakCount = streak.current_unbeaten_streak ?? 0;
          } else if ((streak.current_winless_streak ?? 0) >= Number(thresholds.winless_streak_threshold)) {
            streakType = 'winless';
            streakCount = streak.current_winless_streak ?? 0;
          } else if ((streak.current_loss_streak ?? 0) >= Number(thresholds.loss_streak_threshold)) {
            streakType = 'loss';
            streakCount = streak.current_loss_streak ?? 0;
          } else if ((streak.current_win_streak ?? 0) >= Number(thresholds.win_streak_threshold)) {
            streakType = 'win';
            streakCount = streak.current_win_streak ?? 0;
          }
          
          const playerName = playerNamesMap[streak.player_id] || streak.name || 'Unknown Player';

          return { name: playerName, streak_type: streakType as Streak['streak_type'], streak_count: streakCount };
        }).filter(streak => streak.streak_count > 0);

        const formattedGoalStreaks = goalStreaksCache.map(streak => {
          const playerName = playerNamesMap[streak.player_id] || streak.name || 'Unknown Player';
          return {
              name: playerName,
              matches_with_goals: streak.current_scoring_streak,
              goals_in_streak: streak.goals_in_scoring_streak
          };
        });
        
        return {
          matchInfo: matchInfo,
          gamesMilestones: gamesMilestones || [],
          goalsMilestones: goalsMilestones || [],
          streaks: formattedStreaks || [],
          goalStreaks: formattedGoalStreaks || [],
          halfSeasonGoalLeaders: extractedHalfSeasonGoalLeaders || [],
          halfSeasonFantasyLeaders: extractedHalfSeasonFantasyLeaders || [],
          seasonGoalLeaders: extractedSeasonGoalLeaders || [],
          seasonFantasyLeaders: extractedSeasonFantasyLeaders || [],
          on_fire_player_id: matchReportCache.on_fire_player_id ? String(matchReportCache.on_fire_player_id) : null,
          grim_reaper_player_id: matchReportCache.grim_reaper_player_id ? String(matchReportCache.grim_reaper_player_id) : null
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
          grim_reaper_player_id: matchReportCache.grim_reaper_player_id ? String(matchReportCache.grim_reaper_player_id) : null
        };
      }
    } catch (error) {
      console.error('CRITICAL ERROR fetching match report:', error);
      return null;
    }
  },
  ['match-report-data'],
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

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Failed to fetch match report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch match report', details: error.message },
      { status: 500 }
    );
  }
} 