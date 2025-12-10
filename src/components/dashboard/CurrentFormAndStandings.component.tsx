'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui-kit/Button.component';
import FireIcon from '@/components/icons/FireIcon.component';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon.component';
import { LeaderData } from '@/utils/timeline.util';
import { PlayerProfile } from '@/types/player.types';
import { apiFetch } from '@/lib/apiConfig';

interface MatchInfo {
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_scorers?: string;
  team_b_scorers?: string;
}

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

interface CurrentFormData {
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
}

const CurrentFormAndStandings: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [matchData, setMatchData] = useState<CurrentFormData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [teamAName, setTeamAName] = useState<string>('Team A');
  const [teamBName, setTeamBName] = useState<string>('Team B');
  const [allPlayers, setAllPlayers] = useState<PlayerProfile[]>([]);
  const [showOnFireConfig, setShowOnFireConfig] = useState<boolean>(true);
  const [showGrimReaperConfig, setShowGrimReaperConfig] = useState<boolean>(true);

  const formatDateSafely = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const getOrdinalSuffix = (num: number): string => {
    if (num === 0) return "0th";
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return num + "st";
    }
    if (j === 2 && k !== 12) {
      return num + "nd";
    }
    if (j === 3 && k !== 13) {
      return num + "rd";
    }
    return num + "th";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [matchResponse, playersResponse, configResponse] = await Promise.all([
        apiFetch('/matchReport'),
        apiFetch('/players'),
        apiFetch('/admin/app-config?group=match_settings')
      ]);
      
      if (!matchResponse.ok) {
        console.warn(`Match API returned ${matchResponse.status} - no match data available`);
        setMatchData(null); // Set null data for new tenants
      } else {
        const matchResult = await matchResponse.json();
        if (matchResult.success) {
          setMatchData(matchResult.data); // Can be null for new tenants
        }
      }

      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        setAllPlayers(playersData.data || []);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.success) {
          const teamAConfig = configData.data.find((config: any) => config.config_key === 'team_a_name');
          const teamBConfig = configData.data.find((config: any) => config.config_key === 'team_b_name');
          const showOnFire = configData.data.find((config: any) => config.config_key === 'show_on_fire');
          const showGrimReaper = configData.data.find((config: any) => config.config_key === 'show_grim_reaper');
          
          if (teamAConfig?.config_value) setTeamAName(teamAConfig.config_value);
          if (teamBConfig?.config_value) setTeamBName(teamBConfig.config_value);
          setShowOnFireConfig(showOnFire?.config_value !== 'false');
          setShowGrimReaperConfig(showGrimReaper?.config_value !== 'false');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPlayerByName = (name: string) => {
    return allPlayers.find(p => p.name === name);
  };

  const renderPlayerName = (playerName: string) => {
    const cleanPlayerName = playerName.replace(/\s*\(\d+\)$/, '').trim();
    const actualPlayer = getPlayerByName(cleanPlayerName);
    const actualPlayerId = actualPlayer?.id;
    const isRinger = actualPlayer?.isRinger;

    const content = (
      <>
        {playerName}
        {showOnFireConfig && actualPlayerId && actualPlayerId === matchData?.on_fire_player_id && (
          <FireIcon className="w-4 h-4 ml-1" />
        )}
        {showGrimReaperConfig && actualPlayerId && actualPlayerId === matchData?.grim_reaper_player_id && (
          <GrimReaperIcon className="w-6 h-6 ml-1 text-black" />
        )}
      </>
    );

    if (actualPlayerId && !isRinger) {
      return (
        <Link href={`/player/profiles/${actualPlayerId}`} className="hover:border-b hover:border-current">
          <span className="inline-flex items-center text-slate-700">
            {content}
          </span>
        </Link>
      );
    }

    return (
      <span className="inline-flex items-center text-slate-700">
        {content}
      </span>
    );
  };

  const getPlayersWithGoals = (players: string[], scorers?: string) => {
    if (!scorers) return players;
    
    const goalCounts: { [key: string]: number } = {};
    
    const scorerEntries = scorers.split(',').map(s => s.trim());
    scorerEntries.forEach(entry => {
      const match = entry.match(/^(.+?)(?:\s*\((\d+)\))?$/);
      if (match) {
        const playerName = match[1].trim();
        const goals = match[2] ? parseInt(match[2]) : 1;
        goalCounts[playerName] = (goalCounts[playerName] || 0) + goals;
      }
    });
    
    return players.map(player => {
      const goals = goalCounts[player];
      return goals ? `${player} (${goals})` : player;
    });
  };

  const splitPlayersIntoColumns = (players: string[]) => {
    const leftCount = Math.ceil(players.length / 2);
    return {
      leftColumn: players.slice(0, leftCount),
      rightColumn: players.slice(leftCount)
    };
  };

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Loading match data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center text-red-500">
            <p>Error loading match data</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!matchData || !matchData.matchInfo) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Latest Match</h5>
        </div>
        <div className="p-4">
          <div className="text-center">
            <p className="text-sm text-slate-500">No match data available</p>
          </div>
        </div>
      </div>
    );
  }

  const { matchInfo } = matchData;
  const teamAWithGoals = getPlayersWithGoals(matchInfo.team_a_players, matchInfo.team_a_scorers);
  const teamBWithGoals = getPlayersWithGoals(matchInfo.team_b_players, matchInfo.team_b_scorers);
  const teamAColumns = splitPlayersIntoColumns(teamAWithGoals);
  const teamBColumns = splitPlayersIntoColumns(teamBWithGoals);

  return (
    <div className="space-y-6">
      {/* Latest Match */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="flex-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h6 className="mb-1 text-lg font-semibold text-slate-700">Latest Match</h6>
                <p className="text-sm text-slate-500">{formatDateSafely(matchInfo.match_date)}</p>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-700">{teamAName}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-slate-900">{matchInfo.team_a_score}</span>
                <span className="text-slate-400">-</span>
                <span className="text-3xl font-bold text-slate-900">{matchInfo.team_b_score}</span>
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold text-slate-700">{teamBName}</p>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h6 className="text-md font-semibold text-slate-700 mb-3">{teamAName}</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  {teamAColumns.leftColumn.map((player, index) => (
                    <div key={index} className="text-sm">
                      {renderPlayerName(player)}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {teamAColumns.rightColumn.map((player, index) => (
                    <div key={index} className="text-sm">
                      {renderPlayerName(player)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team B */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h6 className="text-md font-semibold text-slate-700 mb-3">{teamBName}</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  {teamBColumns.leftColumn.map((player, index) => (
                    <div key={index} className="text-sm">
                      {renderPlayerName(player)}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {teamBColumns.rightColumn.map((player, index) => (
                    <div key={index} className="text-sm">
                      {renderPlayerName(player)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones */}
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="flex-auto p-6">
            <div className="mb-4">
              <h6 className="mb-1 text-lg font-semibold text-slate-700">Milestones</h6>
              <p className="text-sm text-slate-500">Recent achievements</p>
            </div>

            {((matchData.gamesMilestones && matchData.gamesMilestones.length > 0) || 
              (matchData.goalsMilestones && matchData.goalsMilestones.length > 0)) ? (
              <div className="space-y-4">
                {matchData.gamesMilestones && matchData.gamesMilestones.length > 0 && (
                  <div>
                    <h6 className="text-sm font-semibold text-slate-600 mb-2">Game Milestones</h6>
                    <div className="space-y-1">
                      {matchData.gamesMilestones.map((milestone, index) => (
                        <p key={index} className="text-sm text-slate-700">
                          <strong>{milestone.name}</strong> - Played {getOrdinalSuffix(milestone.total_games || milestone.value || 0)} game
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {matchData.goalsMilestones && matchData.goalsMilestones.length > 0 && (
                  <div>
                    <h6 className="text-sm font-semibold text-slate-600 mb-2">Goal Milestones</h6>
                    <div className="space-y-1">
                      {matchData.goalsMilestones.map((milestone, index) => (
                        <p key={index} className="text-sm text-slate-700">
                          <strong>{milestone.name}</strong> - Scored {getOrdinalSuffix(milestone.total_goals || milestone.value || 0)} goal
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No milestones achieved in this match</p>
            )}
          </div>
        </div>

        {/* Current Form */}
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="flex-auto p-6">
            <div className="mb-4">
              <h6 className="mb-1 text-lg font-semibold text-slate-700">Current Form</h6>
              <p className="text-sm text-slate-500">Active streaks</p>
            </div>

            {((matchData.streaks && matchData.streaks.length > 0) || 
              (matchData.goalStreaks && matchData.goalStreaks.length > 0)) ? (
              <div className="space-y-4">
                {matchData.streaks && matchData.streaks.length > 0 && (
                  <div>
                    <h6 className="text-sm font-semibold text-slate-600 mb-2">Form Streaks</h6>
                    <div className="space-y-1">
                      {matchData.streaks.map((streak, index) => {
                        const streakType = 
                          streak.streak_type === 'win' ? 'winning' :
                          streak.streak_type === 'loss' ? 'losing' :
                          streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless';
                        
                        return (
                          <p key={index} className="text-sm text-slate-700">
                            <strong>{streak.name}</strong> - {streak.streak_count} game {streakType} streak
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                {matchData.goalStreaks && matchData.goalStreaks.length > 0 && (() => {
                  // Filter goal streaks to only include players who played in this match
                  const allMatchPlayers = [
                    ...(matchData.matchInfo?.team_a_players || []),
                    ...(matchData.matchInfo?.team_b_players || [])
                  ];
                  const filteredGoalStreaks = matchData.goalStreaks.filter(streak => 
                    allMatchPlayers.includes(streak.name)
                  );
                  
                  return filteredGoalStreaks.length > 0 && (
                    <div>
                      <h6 className="text-sm font-semibold text-slate-600 mb-2">Scoring Streaks</h6>
                      <div className="space-y-1">
                        {filteredGoalStreaks.map((streak, index) => (
                          <p key={index} className="text-sm text-slate-700">
                            <strong>{streak.name}</strong> - {streak.matches_with_goals} consecutive matches ({streak.goals_in_streak} goals)
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No active streaks</p>
            )}
          </div>
        </div>
      </div>

      {/* Leaders */}
      {((matchData.halfSeasonGoalLeaders && matchData.halfSeasonGoalLeaders.length > 0) ||
        (matchData.halfSeasonFantasyLeaders && matchData.halfSeasonFantasyLeaders.length > 0) ||
        (matchData.seasonGoalLeaders && matchData.seasonGoalLeaders.length > 0) ||
        (matchData.seasonFantasyLeaders && matchData.seasonFantasyLeaders.length > 0)) && (
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="flex-auto p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h6 className="mb-1 text-lg font-semibold text-slate-700">Leaderboard Updates</h6>
                  <p className="text-sm text-slate-500">Recent changes in standings</p>
                </div>
                <Link href="/player/table" className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                  View Table →
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {matchData.halfSeasonGoalLeaders && matchData.halfSeasonGoalLeaders.map((leader, index) => (
                <div key={`hsg-${index}`} className="text-sm">
                  <span className="font-medium text-slate-700">{leader.new_leader}</span>
                  <span className="text-slate-500"> leads half-season goals with {leader.new_leader_goals || leader.value}</span>
                </div>
              ))}
              
              {matchData.halfSeasonFantasyLeaders && matchData.halfSeasonFantasyLeaders.map((leader, index) => (
                <div key={`hsf-${index}`} className="text-sm">
                  <span className="font-medium text-slate-700">{leader.new_leader}</span>
                  <span className="text-slate-500"> leads half-season fantasy with {leader.new_leader_points || leader.value}</span>
                </div>
              ))}
              
              {matchData.seasonGoalLeaders && matchData.seasonGoalLeaders.map((leader, index) => (
                <div key={`sg-${index}`} className="text-sm">
                  <span className="font-medium text-slate-700">{leader.new_leader}</span>
                  <span className="text-slate-500"> leads season goals with {leader.new_leader_goals || leader.value}</span>
                </div>
              ))}
              
              {matchData.seasonFantasyLeaders && matchData.seasonFantasyLeaders.map((leader, index) => (
                <div key={`sf-${index}`} className="text-sm">
                  <span className="font-medium text-slate-700">{leader.new_leader}</span>
                  <span className="text-slate-500"> leads season fantasy with {leader.new_leader_points || leader.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentFormAndStandings; 