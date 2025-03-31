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
  if (!data) return [];
  if (Array.isArray(data)) return data.map(item => String(item)).filter(Boolean);
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.map(item => String(item)).filter(Boolean);
    } catch (e) {
      console.error('Error parsing string array:', e);
    }
  }
  return [];
};

const validateString = (data: any): string | undefined => {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data
      .filter(s => s && s.name && s.goals)
      .sort((a, b) => (a.name?.localeCompare(b.name) || 0))
      .map(s => `${s.name} (${s.goals})`)
      .join(', ');
  }
  return undefined;
};

const validateConfigValues = (data: any): {
  win_streak_threshold: number;
  unbeaten_streak_threshold: number;
  loss_streak_threshold: number;
  winless_streak_threshold: number;
  goal_streak_threshold: number;
} => {
  if (!data) {
    return {
      win_streak_threshold: 4,
      unbeaten_streak_threshold: 6,
      loss_streak_threshold: 4,
      winless_streak_threshold: 6,
      goal_streak_threshold: 3
    };
  }

  return {
    win_streak_threshold: Number(data.win_streak_threshold) || 4,
    unbeaten_streak_threshold: Number(data.unbeaten_streak_threshold) || 6,
    loss_streak_threshold: Number(data.loss_streak_threshold) || 4,
    winless_streak_threshold: Number(data.winless_streak_threshold) || 6,
    goal_streak_threshold: Number(data.goal_streak_threshold) || 3
  };
};

const validateMilestones = (data: any): Milestone[] | undefined => {
  if (!Array.isArray(data)) return undefined;
  return data
    .filter(m => m && typeof m.name === 'string')
    .map(m => ({
      name: m.name,
      total_games: typeof m.total_games === 'number' ? m.total_games : undefined,
      total_goals: typeof m.total_goals === 'number' ? m.total_goals : undefined
    }));
};

export async function GET() {
  try {
    console.log('Fetching match report from cache...');

    const matchReportCache = await prisma.aggregated_match_report.findFirst({
      orderBy: {
        match_date: 'desc'
      }
    });

    console.log('Raw match report cache:', JSON.stringify(matchReportCache, null, 2));

    if (!matchReportCache) {
      return NextResponse.json({
        success: false,
        error: 'No match data found'
      } as ApiResponse, { status: 404 });
    }

    // Validate and transform data
    const matchInfo: MatchInfo = {
      match_date: matchReportCache.match_date.toISOString(),
      team_a_score: Number(matchReportCache.team_a_score) || 0,
      team_b_score: Number(matchReportCache.team_b_score) || 0,
      team_a_players: validateStringArray(matchReportCache.team_a_players),
      team_b_players: validateStringArray(matchReportCache.team_b_players),
      team_a_scorers: validateString(matchReportCache.team_a_scorers),
      team_b_scorers: validateString(matchReportCache.team_b_scorers)
    };

    console.log('Transformed match info:', JSON.stringify(matchInfo, null, 2));

    // Get config values for streak thresholds
    const thresholds = validateConfigValues(matchReportCache.config_values);
    console.log('Config thresholds:', JSON.stringify(thresholds, null, 2));
    
    // Get data from aggregated_match_streaks cache
    const streaksCache = await prisma.aggregated_match_streaks.findMany({
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

    console.log('Streaks cache:', JSON.stringify(streaksCache, null, 2));

    // Get goal streak data 
    const goalStreaksCache = await prisma.aggregated_match_streaks.findMany({
      where: {
        current_scoring_streak: { gte: Number(thresholds.goal_streak_threshold) }
      },
      orderBy: [
        { current_scoring_streak: 'desc' },
        { goals_in_scoring_streak: 'desc' }
      ]
    });

    console.log('Goal streaks cache:', JSON.stringify(goalStreaksCache, null, 2));

    // Get half-season leaders
    const halfSeasonLeaders = await prisma.aggregated_match_streaks.findMany({
      where: {
        OR: [
          { half_season_goals: { not: null } },
          { half_season_fantasy_points: { not: null } }
        ]
      }
    }) as unknown as Array<{
      player_id: number;
      name: string | null;
      half_season_goals: number | null;
      half_season_fantasy_points: number | null;
      previous_half_season_goals: number | null;
      previous_half_season_fantasy: number | null;
      half_season_goals_rank: number | null;
      half_season_fantasy_rank: number | null;
      half_season_goals_status: string | null;
      half_season_fantasy_status: string | null;
      previous_half_season_goals_leader_id: number | null;
      previous_half_season_fantasy_leader_id: number | null;
    }>;

    console.log('Half season leaders:', JSON.stringify(halfSeasonLeaders, null, 2));

    // Get season leaders
    const seasonLeaders = await prisma.aggregated_match_streaks.findMany({
      where: {
        OR: [
          { season_goals: { not: null } },
          { season_fantasy_points: { not: null } }
        ]
      }
    }) as unknown as Array<{
      player_id: number;
      name: string | null;
      season_goals: number | null;
      season_fantasy_points: number | null;
      previous_season_goals: number | null;
      previous_season_fantasy: number | null;
      season_goals_rank: number | null;
      season_fantasy_rank: number | null;
      season_goals_status: string | null;
      season_fantasy_status: string | null;
      previous_season_goals_leader_id: number | null;
      previous_season_fantasy_leader_id: number | null;
    }>;

    console.log('Season leaders:', JSON.stringify(seasonLeaders, null, 2));

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

    // Format goal streaks
    const formattedGoalStreaks = goalStreaksCache.map(streak => ({
      name: streak.name,
      matches_with_goals: streak.current_scoring_streak,
      goals_in_streak: streak.goals_in_scoring_streak
    }));

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

    // Format match data
    const response = NextResponse.json({
      success: true,
      data: {
        matchInfo,
        gamesMilestones: validateMilestones(matchReportCache.game_milestones),
        goalsMilestones: validateMilestones(matchReportCache.goal_milestones),
        streaks: formattedStreaks,
        goalStreaks: formattedGoalStreaks,
        halfSeasonGoalLeaders,
        halfSeasonFantasyLeaders,
        seasonGoalLeaders,
        seasonFantasyLeaders
      }
    } as ApiResponse);

    // Add cache headers
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    return response;

  } catch (error) {
    console.error('Error in GET /api/matchReport:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    } as ApiResponse, { status: 500 });
  }
} 