import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Add dynamic configuration to prevent static generation
export const dynamic = 'force-dynamic';

// Define interfaces for our data structures
interface StreakData {
  player_id: number;
  name: string;
  current_win_streak: number;
  current_unbeaten_streak: number;
  current_loss_streak: number;
  current_winless_streak: number;
  current_scoring_streak: number;
  goals_in_scoring_streak: number;
  half_season_goals?: number | null;
  season_goals?: number | null;
  half_season_fantasy_points?: number | null;
  season_fantasy_points?: number | null;
  is_half_season_leader: boolean;
  previous_half_season_leader: boolean;
  is_season_leader: boolean;
  previous_season_leader: boolean;
}

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET() {
  try {
    console.log('Fetching match report from cache...');

    // Get data from aggregated_match_report cache
    const matchReportCache = await prisma.aggregated_match_report.findFirst({
      orderBy: {
        match_date: 'desc'
      }
    });

    if (!matchReportCache) {
      console.log('No match report cache found');
      return NextResponse.json({
        success: false,
        error: 'No match data found'
      });
    }

    // Get config values for streak thresholds
    const thresholds = (matchReportCache as any).config_values || {
      win_streak_threshold: 4,
      unbeaten_streak_threshold: 6,
      loss_streak_threshold: 4,
      winless_streak_threshold: 6,
      goal_streak_threshold: 3
    };
    
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

    // Get leader data
    const halfSeasonLeaders = await prisma.aggregated_match_streaks.findMany({
      where: {
        OR: [
          { is_half_season_leader: true },
          { previous_half_season_leader: true }
        ]
      }
    });

    const seasonLeaders = await prisma.aggregated_match_streaks.findMany({
      where: {
        OR: [
          { is_season_leader: true },
          { previous_season_leader: true }
        ]
      }
    });

    // Format streaks data to match expected format
    const formattedStreaks = streaksCache.map(streak => {
      // Determine which streak to use (win, loss, unbeaten, winless)
      let streakType = '';
      let streakCount = 0;

      if (streak.current_unbeaten_streak >= Number(thresholds.unbeaten_streak_threshold)) {
        streakType = 'unbeaten';
        streakCount = streak.current_unbeaten_streak;
      } else if (streak.current_winless_streak >= Number(thresholds.winless_streak_threshold)) {
        streakType = 'winless';
        streakCount = streak.current_winless_streak;
      } else if (streak.current_win_streak >= Number(thresholds.win_streak_threshold)) {
        streakType = 'win';
        streakCount = streak.current_win_streak;
      } else if (streak.current_loss_streak >= Number(thresholds.loss_streak_threshold)) {
        streakType = 'loss';
        streakCount = streak.current_loss_streak;
      }

      return {
        name: streak.name,
        streak_type: streakType,
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
      .filter(leader => leader.is_half_season_leader)
      .map(leader => {
        const previousLeader = halfSeasonLeaders.find(
          l => l.previous_half_season_leader && !l.is_half_season_leader
        );
        
        let changeType = 'remains';
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
      .filter(leader => leader.is_half_season_leader)
      .map(leader => {
        const previousLeader = halfSeasonLeaders.find(
          l => l.previous_half_season_leader && !l.is_half_season_leader
        );
        
        let changeType = 'remains';
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
      .filter(leader => leader.is_season_leader)
      .map(leader => {
        const previousLeader = seasonLeaders.find(
          l => l.previous_season_leader && !l.is_season_leader
        );
        
        let changeType = 'remains';
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
      .filter(leader => leader.is_season_leader)
      .map(leader => {
        const previousLeader = seasonLeaders.find(
          l => l.previous_season_leader && !l.is_season_leader
        );
        
        let changeType = 'remains';
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
    const formatScorers = (scorers: any[] | null) => {
      if (!scorers || !Array.isArray(scorers)) return '';
      
      return scorers
        .filter(s => s && s.name && s.goals)
        .sort((a, b) => (a.name?.localeCompare(b.name) || 0))
        .map(s => `${s.name} (${s.goals})`)
        .join(', ');
    };

    const matchInfo = {
      match_id: matchReportCache.match_id,
      match_date: matchReportCache.match_date,
      team_a_score: matchReportCache.team_a_score || 0,
      team_b_score: matchReportCache.team_b_score || 0,
      team_a_players: matchReportCache.team_a_players || [],
      team_b_players: matchReportCache.team_b_players || [],
      team_a_scorers: formatScorers(matchReportCache.team_a_scorers as any[] || []),
      team_b_scorers: formatScorers(matchReportCache.team_b_scorers as any[] || [])
    };

          return NextResponse.json({
            success: true,
            data: {
        matchInfo: serializeData(matchInfo),
        gamesMilestones: serializeData(matchReportCache.game_milestones || []),
        goalsMilestones: serializeData(matchReportCache.goal_milestones || []),
        streaks: serializeData(formattedStreaks || []),
        goalStreaks: serializeData(formattedGoalStreaks || []),
        halfSeasonGoalLeaders: serializeData(halfSeasonGoalLeaders || []),
        halfSeasonFantasyLeaders: serializeData(halfSeasonFantasyLeaders || []),
        seasonGoalLeaders: serializeData(seasonGoalLeaders || []),
        seasonFantasyLeaders: serializeData(seasonFantasyLeaders || [])
      }
    });
  } catch (error) {
    console.error('Error generating match report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate match report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 