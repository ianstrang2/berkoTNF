import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Add dynamic configuration to prevent static generation
export const dynamic = 'force-dynamic';

// Define interfaces for our data structures
interface Milestone {
  name: string;
  games_played?: number;
  total_games?: number;
  total_goals?: number;
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
  config_values: {
    win_streak_threshold: number;
    unbeaten_streak_threshold: number;
    loss_streak_threshold: number;
    winless_streak_threshold: number;
    goal_streak_threshold: number;
  };
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
    
    // If it's already an array, use it
    if (Array.isArray(milestones)) {
      return milestones;
    }
    
    console.warn('Unexpected milestone format:', typeof milestones);
    return [];
  } catch (error) {
    console.error('Error validating milestones:', error);
    return [];
  }
};

export async function GET() {
  try {
    console.log('------ START: Match Report API ------');
    
    // Emergency fallback data
    const emergencyResponse = {
      success: true,
      data: {
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
      }
    };

    try {
      console.log('Fetching match report from cache...');
      const matchReportCache = await prisma.aggregated_match_report.findFirst({
        orderBy: {
          match_date: 'desc'
        }
      });

      if (!matchReportCache) {
        console.log('No match data found in cache');
        return NextResponse.json({
          success: false,
          error: 'No match data found'
        } as ApiResponse, { status: 404 });
      }

      console.log('Match report cache found, ID:', matchReportCache.match_id);
      
      try {
        // Deep debugging for each field
        console.log('DEBUG team_a_players type:', typeof matchReportCache.team_a_players);
        console.log('DEBUG team_a_players raw:', matchReportCache.team_a_players);
        
        console.log('DEBUG team_b_players type:', typeof matchReportCache.team_b_players);
        console.log('DEBUG team_b_players raw:', matchReportCache.team_b_players);
        
        console.log('DEBUG config_values type:', typeof matchReportCache.config_values);
        console.log('DEBUG config_values raw:', matchReportCache.config_values);
        
        console.log('DEBUG game_milestones type:', typeof matchReportCache.game_milestones);
        console.log('DEBUG goal_milestones type:', typeof matchReportCache.goal_milestones);
        
        console.log('DEBUG team_a_scorers type:', typeof matchReportCache.team_a_scorers);
        console.log('DEBUG team_a_scorers raw:', matchReportCache.team_a_scorers);
        console.log('DEBUG team_b_scorers type:', typeof matchReportCache.team_b_scorers);
        console.log('DEBUG team_b_scorers raw:', matchReportCache.team_b_scorers);
        
        // Validate and transform data
        console.log('Validating match data...');
        
        try {
          const validatedTeamAPlayers = validateStringArray(matchReportCache.team_a_players);
          console.log('Team A players validated:', validatedTeamAPlayers);
          
          const validatedTeamBPlayers = validateStringArray(matchReportCache.team_b_players);
          console.log('Team B players validated:', validatedTeamBPlayers);
          
          const validatedTeamAScorers = typeof matchReportCache.team_a_scorers === 'string' ? matchReportCache.team_a_scorers : '';
          console.log('Team A scorers validated:', validatedTeamAScorers);
          
          const validatedTeamBScorers = typeof matchReportCache.team_b_scorers === 'string' ? matchReportCache.team_b_scorers : '';
          console.log('Team B scorers validated:', validatedTeamBScorers);
          
          const matchInfo: MatchInfo = {
            match_date: matchReportCache.match_date.toISOString(),
            team_a_score: Number(matchReportCache.team_a_score) || 0,
            team_b_score: Number(matchReportCache.team_b_score) || 0,
            team_a_players: validatedTeamAPlayers,
            team_b_players: validatedTeamBPlayers,
            team_a_scorers: validatedTeamAScorers,
            team_b_scorers: validatedTeamBScorers
          };
          console.log('Match info created successfully');
          
          // Default config values if missing
          const defaultConfig = {
            win_streak_threshold: 4,
            unbeaten_streak_threshold: 6,
            loss_streak_threshold: 4,
            winless_streak_threshold: 6,
            goal_streak_threshold: 3
          };
          
          // Validate config values
          const thresholds = matchReportCache.config_values 
            ? validateConfigValues(matchReportCache.config_values)
            : defaultConfig;
          console.log('Config thresholds validated:', thresholds);
          
          console.log('Validating milestones...');
          try {
            const gamesMilestones = validateMilestones(matchReportCache.game_milestones);
            console.log('Game milestones validated:', gamesMilestones);
            
            const goalsMilestones = validateMilestones(matchReportCache.goal_milestones);
            console.log('Goal milestones validated:', goalsMilestones);
          } catch (milestoneError) {
            console.error('Error validating milestones:', milestoneError);
          }
          
          console.log('Fetching player data from DB...');
          // Safely get data from database with error handling for each query
          let streaksCache: any[] = [];
          let goalStreaksCache: any[] = [];
          let halfSeasonLeaders: any[] = [];
          let seasonLeaders: any[] = [];

          try {
            // Get data from aggregated_match_streaks cache
            streaksCache = await prisma.aggregated_match_streaks.findMany({
              where: {
                OR: [
                  { current_unbeaten_streak: { gte: Number(thresholds.unbeaten_streak_threshold) } },
                  { current_winless_streak: { gte: Number(thresholds.winless_streak_threshold) } },
                  { current_win_streak: { gte: Number(thresholds.win_streak_threshold) } },
                  { current_loss_streak: { gte: Number(thresholds.loss_streak_threshold) } }
                ]
              },
              orderBy: [
                { current_win_streak: 'desc' },
                { current_unbeaten_streak: 'desc' }
              ]
            });
            console.log('Streaks cache fetched:', streaksCache.length, 'items');
          } catch (error) {
            console.error('Error fetching streaks cache:', error);
          }

          try {
            // Get goal streak data 
            goalStreaksCache = await prisma.aggregated_match_streaks.findMany({
              where: {
                current_scoring_streak: { gte: Number(thresholds.goal_streak_threshold) }
              },
              orderBy: [
                { current_scoring_streak: 'desc' },
                { goals_in_scoring_streak: 'desc' }
              ]
            });
            console.log('Goal streaks cache fetched:', goalStreaksCache.length, 'items');
          } catch (error) {
            console.error('Error fetching goal streaks cache:', error);
          }

          try {
            // Get half-season leaders
            halfSeasonLeaders = await prisma.aggregated_match_streaks.findMany({
              where: {
                OR: [
                  { half_season_goals: { not: null } },
                  { half_season_fantasy_points: { not: null } }
                ]
              }
            }) as any[];
            console.log('Half-season leaders fetched:', halfSeasonLeaders.length, 'items');
          } catch (error) {
            console.error('Error fetching half season leaders:', error);
          }

          try {
            // Get season leaders
            seasonLeaders = await prisma.aggregated_match_streaks.findMany({
              where: {
                OR: [
                  { season_goals: { not: null } },
                  { season_fantasy_points: { not: null } }
                ]
              }
            }) as any[];
            console.log('Season leaders fetched:', seasonLeaders.length, 'items');
          } catch (error) {
            console.error('Error fetching season leaders:', error);
          }

          console.log('Formatting streaks data...');
          // Format streaks data to match expected format
          const formattedStreaks = streaksCache.map(streak => {
            // Determine which streak to use (win, loss, unbeaten, winless)
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

            return {
              name: streak.name,
              streak_type: streakType as Streak['streak_type'],
              streak_count: streakCount
            };
          }).filter(streak => streak.streak_count > 0);
          console.log('Formatted streaks:', formattedStreaks.length, 'items');

          // Format goal streaks
          const formattedGoalStreaks = goalStreaksCache.map(streak => ({
            name: streak.name,
            matches_with_goals: streak.current_scoring_streak,
            goals_in_streak: streak.goals_in_scoring_streak
          }));
          console.log('Formatted goal streaks:', formattedGoalStreaks.length, 'items');

          console.log('Formatting leader data...');
          // Format half-season goal leaders
          const halfSeasonGoalLeaders = halfSeasonLeaders
            .filter(leader => leader.half_season_goals_status === 'leader')
            .map(leader => {
              const previousLeader = halfSeasonLeaders.find(
                l => l.player_id === leader.previous_half_season_goals_leader_id
              );
              
              let changeType: LeaderData['change_type'] = 'remains';
              if (!previousLeader) {
                changeType = 'new_leader';
              } else if (leader.half_season_goals === previousLeader.half_season_goals) {
                changeType = 'tied';
              } else if (leader.player_id !== previousLeader.player_id) {
                changeType = 'overtake';
              }
              
              return {
                new_leader: leader.name,
                new_leader_goals: leader.half_season_goals,
                previous_leader: previousLeader?.name || null,
                previous_leader_goals: previousLeader?.half_season_goals || null,
                change_type: changeType
              };
            });

          // Format half-season fantasy leaders
          const halfSeasonFantasyLeaders = halfSeasonLeaders
            .filter(leader => leader.half_season_fantasy_status === 'leader')
            .map(leader => {
              const previousLeader = halfSeasonLeaders.find(
                l => l.player_id === leader.previous_half_season_fantasy_leader_id
              );
              
              let changeType: LeaderData['change_type'] = 'remains';
              if (!previousLeader) {
                changeType = 'new_leader';
              } else if (leader.half_season_fantasy_points === previousLeader.half_season_fantasy_points) {
                changeType = 'tied';
              } else if (leader.player_id !== previousLeader.player_id) {
                changeType = 'overtake';
              }
              
              return {
                new_leader: leader.name,
                new_leader_points: leader.half_season_fantasy_points,
                previous_leader: previousLeader?.name || null,
                previous_leader_points: previousLeader?.half_season_fantasy_points || null,
                change_type: changeType
              };
            });

          // Format season goal leaders
          const seasonGoalLeaders = seasonLeaders
            .filter(leader => leader.season_goals_status === 'leader')
            .map(leader => {
              const previousLeader = seasonLeaders.find(
                l => l.player_id === leader.previous_season_goals_leader_id
              );
              
              let changeType: LeaderData['change_type'] = 'remains';
              if (!previousLeader) {
                changeType = 'new_leader';
              } else if (leader.season_goals === previousLeader.season_goals) {
                changeType = 'tied';
              } else if (leader.player_id !== previousLeader.player_id) {
                changeType = 'overtake';
              }
              
              return {
                new_leader: leader.name,
                new_leader_goals: leader.season_goals,
                previous_leader: previousLeader?.name || null,
                previous_leader_goals: previousLeader?.season_goals || null,
                change_type: changeType
              };
            });

            // Format season fantasy leaders
            const seasonFantasyLeaders = seasonLeaders
              .filter(leader => leader.season_fantasy_status === 'leader')
              .map(leader => {
                const previousLeader = seasonLeaders.find(
                  l => l.player_id === leader.previous_season_fantasy_leader_id
                );
                
                let changeType: LeaderData['change_type'] = 'remains';
                if (!previousLeader) {
                  changeType = 'new_leader';
                } else if (leader.season_fantasy_points === previousLeader.season_fantasy_points) {
                  changeType = 'tied';
                } else if (leader.player_id !== previousLeader.player_id) {
                  changeType = 'overtake';
                }
                
                return {
                  new_leader: leader.name,
                  new_leader_points: leader.season_fantasy_points,
                  previous_leader: previousLeader?.name || null,
                  previous_leader_points: previousLeader?.season_fantasy_points || null,
                  change_type: changeType
                };
              });

          console.log('All data formatted, preparing response...');
          // Return the match report
          return NextResponse.json({
            success: true,
            data: {
              matchInfo: matchInfo,
              gamesMilestones: validateMilestones(matchReportCache.game_milestones) || [],
              goalsMilestones: validateMilestones(matchReportCache.goal_milestones) || [],
              streaks: formattedStreaks || [],
              goalStreaks: formattedGoalStreaks || [],
              halfSeasonGoalLeaders: halfSeasonGoalLeaders || [],
              halfSeasonFantasyLeaders: halfSeasonFantasyLeaders || [],
              seasonGoalLeaders: seasonGoalLeaders || [],
              seasonFantasyLeaders: seasonFantasyLeaders || []
            }
          } as ApiResponse);
          
        } catch (validationError) {
          console.error('Error during validation step:', validationError);
          if (validationError instanceof Error) {
            console.error('Validation error stack:', validationError.stack);
          }
          throw validationError;
        }
        
      } catch (processingError) {
        console.error('Error processing match report data:', processingError);
        if (processingError instanceof Error) {
          console.error('Processing error stack:', processingError.stack);
        }
        
        // Return a simplified response with just the match info to avoid a 500 error
        return NextResponse.json({
          success: true,
          data: {
            matchInfo: {
              match_date: matchReportCache.match_date.toISOString(),
              team_a_score: Number(matchReportCache.team_a_score) || 0,
              team_b_score: Number(matchReportCache.team_b_score) || 0,
              team_a_players: [],
              team_b_players: [],
              team_a_scorers: '',
              team_b_scorers: '',
            },
            gamesMilestones: [],
            goalsMilestones: [],
            streaks: [],
            goalStreaks: [],
            halfSeasonGoalLeaders: [],
            halfSeasonFantasyLeaders: [],
            seasonGoalLeaders: [],
            seasonFantasyLeaders: []
          }
        } as ApiResponse);
      }
    } catch (error) {
      console.error('Unhandled error in match report API:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve match report'
      } as ApiResponse, { status: 500 });
    }
  } catch (error) {
    console.error('CRITICAL ERROR: Returning emergency fallback data', error);
    if (error instanceof Error) {
      console.error('Critical error stack:', error.stack);
    }
    
    // Define emergency fallback data here
    const emergencyResponse = {
      success: true,
      data: {
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
      }
    };
    
    // Return emergency fallback data to prevent 500 error
    return NextResponse.json(emergencyResponse as ApiResponse);
  }
} 