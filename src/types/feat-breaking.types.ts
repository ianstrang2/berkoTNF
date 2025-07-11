// src/types/feat-breaking.types.ts

import React from 'react';

/**
 * Represents a feat (record) that was broken or equaled in a match
 */
export interface FeatBreakingItem {
  feat_type: FeatType;
  player_name: string;
  player_id: number;
  new_value: number;
  current_record: number;
  status: 'broken' | 'equaled';
}

/**
 * Types of feats/records that can be broken
 */
export type FeatType = 
  | 'most_goals_in_game'
  | 'win_streak'
  | 'unbeaten_streak'
  | 'loss_streak'
  | 'winless_streak'
  | 'goal_streak'
  | 'biggest_victory'
  | 'attendance_streak';

/**
 * Timeline item for displaying feat-breaking events in the dashboard
 */
export interface RecordsTimelineItem {
  type: 'feat_broken' | 'feat_equaled' | 'milestone' | 'leader_change';
  feat_type?: FeatType;
  player: string;
  playerId?: string;
  content: string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  date: string;
  color: 'purple' | 'amber' | 'blue' | 'green' | 'red';
  previous_record_value?: number;
  key: string;
}

/**
 * Configuration for feat-breaking detection thresholds
 */
export interface FeatBreakingConfig {
  feat_breaking_enabled: boolean;
  win_streak_threshold: number;
  unbeaten_streak_threshold: number;
  loss_streak_threshold: number;
  winless_streak_threshold: number;
  goal_streak_threshold: number;
  goal_milestone_threshold: number;
  hall_of_fame_limit: number;
}

/**
 * Helper functions for feat display
 */
export const getFeatDisplayName = (featType: FeatType): string => {
  const displayNames: Record<FeatType, string> = {
    most_goals_in_game: 'Most Goals in a Game',
    win_streak: 'Win Streak',
    unbeaten_streak: 'Unbeaten Streak',
    loss_streak: 'Losing Streak',
    winless_streak: 'Winless Streak',
    goal_streak: 'Goal Scoring Streak',
    biggest_victory: 'Biggest Victory',
    attendance_streak: 'Attendance Streak'
  };
  return displayNames[featType] || featType;
};

/**
 * Generate human-readable content for a feat-breaking event
 */
export const generateFeatContent = (feat: FeatBreakingItem): string => {
  const action = feat.status === 'broken' ? 'broke' : 'equaled';
  const featName = getFeatDisplayName(feat.feat_type);
  
  if (feat.feat_type === 'most_goals_in_game') {
    return `${action} the ${featName} record with ${feat.new_value} goal${feat.new_value > 1 ? 's' : ''}`;
  }
  
  if (feat.feat_type.includes('streak')) {
    return `${action} the ${featName} record with ${feat.new_value} consecutive ${feat.feat_type.includes('goal') ? 'games scoring' : 'games'}`;
  }
  
  return `${action} the ${featName} record with ${feat.new_value}`;
};

/**
 * Extended match report type that includes feat-breaking data
 */
export interface MatchReportWithFeats {
  match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers: string;
  team_b_scorers: string;
  game_milestones: any[];
  goal_milestones: any[];
  config_values: Record<string, any>;
  half_season_goal_leaders: any;
  half_season_fantasy_leaders: any;
  season_goal_leaders: any;
  season_fantasy_leaders: any;
  on_fire_player_id: number | null;
  grim_reaper_player_id: number | null;
  feat_breaking_data: FeatBreakingItem[];
  last_updated: string;
} 