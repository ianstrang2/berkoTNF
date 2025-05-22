'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui-kit/Button.component';
import FireIcon from '@/components/icons/FireIcon';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon';
import { PersonalBestsAPIResponseData as PersonalBestsData } from '@/app/api/personal-bests/route';

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

interface LeaderData {
  change_type: 'new_leader' | 'tied' | 'remains' | 'overtake';
  new_leader: string;
  previous_leader?: string;
  new_leader_goals?: number;
  new_leader_points?: number;
  previous_leader_goals?: number;
  previous_leader_points?: number;
  value?: number;
}

interface FullMatchReportData {
  matchInfo: MatchInfo;
  gamesMilestones?: Milestone[];
  goalsMilestones?: Milestone[];
  streaks?: Streak[];
  goalStreaks?: GoalStreak[];
  halfSeasonGoalLeaders?: LeaderData[];
  halfSeasonFantasyLeaders?: LeaderData[];
  seasonGoalLeaders?: LeaderData[];
  seasonFantasyLeaders?: LeaderData[];
}

interface PlayerWithNameAndId {
  id: number;
  name: string;
}

interface FullMatchReportDataWithSpecialPlayers extends FullMatchReportData {
  on_fire_player_id?: number | null;
  grim_reaper_player_id?: number | null;
}

const PB_METRIC_DETAILS_FOR_COPY: { [key: string]: { name: string; unit: string } } = {
  'most_goals_in_game': { name: 'Most Goals in Game', unit: 'goals' },
  'longest_win_streak': { name: 'Longest Win Streak', unit: 'games' },
  'longest_undefeated_streak': { name: 'Longest Undefeated Streak', unit: 'games' },
  'longest_losing_streak': { name: 'Longest Losing Streak', unit: 'games' },
  'longest_winless_streak': { name: 'Longest Winless Streak', unit: 'games' },
  'attendance_streak': { name: 'Attendance Streak', unit: 'games' },
};

const LatestMatch: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [matchData, setMatchData] = useState<FullMatchReportDataWithSpecialPlayers | null>(null);
  const [personalBestsData, setPersonalBestsData] = useState<PersonalBestsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [teamAName, setTeamAName] = useState<string>('Team A');
  const [teamBName, setTeamBName] = useState<string>('Team B');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [allPlayers, setAllPlayers] = useState<PlayerWithNameAndId[]>([]);
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
      
      const [matchResponse, playersResponse, configResponse, personalBestsResponse] = await Promise.all([
        fetch('/api/matchReport'),
        fetch('/api/players'),
        fetch('/api/admin/app-config?group=match_settings'),
        fetch('/api/personal-bests')
      ]);
      
      if (!matchResponse.ok) {
        throw new Error(`Match API error: ${matchResponse.status}`);
      }
      const matchResult = await matchResponse.json();
      if (matchResult.success) {
        setMatchData(matchResult.data);
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

      if (personalBestsResponse.ok) {
        const pbResult = await personalBestsResponse.json();
        if (pbResult.success) {
          setPersonalBestsData(pbResult.data);
        } else {
          console.warn('Failed to fetch personal bests for match report copy:', pbResult.error);
          setPersonalBestsData(null);
        }
      } else {
        console.warn(`Personal Bests API error: ${personalBestsResponse.status}`);
        setPersonalBestsData(null);
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

  const getPlayerIdByName = (name: string): number | undefined => {
    const player = allPlayers.find(p => p.name === name);
    return player?.id;
  };

  const formatMatchReportForCopy = (
    data: FullMatchReportDataWithSpecialPlayers | null, 
    pbsData: PersonalBestsData | null,
    showOnFireUi: boolean, 
    showGrimReaperUi: boolean
  ): string => {
    if (!data || !data.matchInfo) return 'No match data available.';
    const { matchInfo } = data;
    const onFireId = data.on_fire_player_id;
    const grimReaperId = data.grim_reaper_player_id;

    let report = `⚽️ MATCH REPORT: ${formatDateSafely(matchInfo.match_date)} ⚽️\n\n`;
    report += `FINAL SCORE: ${teamAName} ${matchInfo.team_a_score} - ${matchInfo.team_b_score} ${teamBName}\n\n`;

    const formatPlayerListForCopy = (playerNames: string[]): string => {
      if (!playerNames || playerNames.length === 0) return '';
      return playerNames.map(playerNameStr => {
        let nameToDisplay = playerNameStr;
        const playerId = getPlayerIdByName(playerNameStr);
        if (playerId !== undefined) {
          if (showOnFireUi && playerId === onFireId) {
            nameToDisplay += ' 🔥';
          }
          if (showGrimReaperUi && playerId === grimReaperId) {
            nameToDisplay += ' 💀';
          }
        }
        return nameToDisplay;
      }).join(', ');
    };

    report += `--- ${teamAName.toUpperCase()} ---\n`;
    report += `Players: ${formatPlayerListForCopy(matchInfo.team_a_players)}\n`;
    if (matchInfo.team_a_scorers) {
      report += `Scorers: ${matchInfo.team_a_scorers}\n`;
    }
    report += `\n--- ${teamBName.toUpperCase()} ---\n`;
    report += `Players: ${formatPlayerListForCopy(matchInfo.team_b_players)}\n`;
    if (matchInfo.team_b_scorers) {
      report += `Scorers: ${matchInfo.team_b_scorers}\n`;
    }

    if (pbsData && pbsData.broken_pbs_data && Object.keys(pbsData.broken_pbs_data).length > 0) {
      report += `\n--- PERSONAL BESTS ACHIEVED ---\n`;
      Object.values(pbsData.broken_pbs_data).forEach(playerPbData => {
        playerPbData.pbs.forEach(pb => {
          const metricDetail = PB_METRIC_DETAILS_FOR_COPY[pb.metric_type];
          if (metricDetail) {
            report += `- ${playerPbData.name}: ${metricDetail.name} - ${pb.value} ${metricDetail.unit}\n`;
          } else {
            report += `- ${playerPbData.name}: ${pb.metric_type.replace(/_/g, ' ')} - ${pb.value}\n`;
          }
        });
      });
    }

    const formatList = (title: string, items: any[] | undefined, formatter: (item: any) => string) => {
      if (items && items.length > 0) {
        report += `\n--- ${title.toUpperCase()} ---\n`;
        items.forEach(item => {
          report += `- ${formatter(item)}\n`;
        });
      }
    };

    formatList('Game Milestones', data.gamesMilestones, item => `${item.name}: Played ${getOrdinalSuffix(item.total_games || item.value || 0)} game`);
    formatList('Goal Milestones', data.goalsMilestones, item => `${item.name}: Scored ${getOrdinalSuffix(item.total_goals || item.value || 0)} goal`);
    formatList('Form Streaks', data.streaks, item => `${item.name}: ${item.streak_count} game ${item.streak_type === 'win' ? 'winning' : item.streak_type === 'loss' ? 'losing' : item.streak_type === 'unbeaten' ? 'unbeaten' : 'winless'} streak`);
    formatList('Goal Scoring Streaks', data.goalStreaks, item => `${item.name}: Scored in ${item.matches_with_goals} consecutive matches (${item.goals_in_streak} goals)`);
    
    const formatLeaderSimple = (leaderData: LeaderData, metric: 'goals' | 'points', period: string): string => {
       if (!leaderData || !leaderData.new_leader) return `Unknown leader in ${metric}`;
       const value = metric === 'goals' ? (leaderData.new_leader_goals || leaderData.value || 0) : (leaderData.new_leader_points || leaderData.value || 0);
       return `${leaderData.new_leader} leads ${period} ${metric} with ${value}`;
    };

    let leaderHeaderAdded = false;
    const ensureLeaderHeader = () => {
      if (!leaderHeaderAdded) {
        report += `\n--- LEADERBOARDS ---\n`;
        leaderHeaderAdded = true;
      }
    };

    if (data.halfSeasonGoalLeaders && data.halfSeasonGoalLeaders.length > 0) {
        ensureLeaderHeader();
        if (data.halfSeasonGoalLeaders.length === 1) {
            report += `- ${formatLeaderSimple(data.halfSeasonGoalLeaders[0], 'goals', 'Half-Season')}\n`;
        } else {
            const leaderNames = data.halfSeasonGoalLeaders.map(l => l.new_leader).join(' and ');
            const goals = data.halfSeasonGoalLeaders[0].new_leader_goals || data.halfSeasonGoalLeaders[0].value || 0;
            report += `- ${leaderNames} lead Half-Season goals with ${goals}\n`;
        }
    }
    if (data.halfSeasonFantasyLeaders && data.halfSeasonFantasyLeaders.length > 0) {
        ensureLeaderHeader();
        if (data.halfSeasonFantasyLeaders.length === 1) {
            report += `- ${formatLeaderSimple(data.halfSeasonFantasyLeaders[0], 'points', 'Half-Season')}\n`;
        } else {
            const leaderNames = data.halfSeasonFantasyLeaders.map(l => l.new_leader).join(' and ');
            const points = data.halfSeasonFantasyLeaders[0].new_leader_points || data.halfSeasonFantasyLeaders[0].value || 0;
            report += `- ${leaderNames} lead Half-Season points with ${points}\n`;
        }
    }

    const currentDate = matchInfo.match_date ? new Date(matchInfo.match_date) : new Date();
    const isSecondHalf = currentDate.getMonth() >= 6;

    if (isSecondHalf && data.seasonGoalLeaders && data.seasonGoalLeaders.length > 0) {
        ensureLeaderHeader();
        if (data.seasonGoalLeaders.length === 1) {
            report += `- ${formatLeaderSimple(data.seasonGoalLeaders[0], 'goals', 'Season')}\n`;
        } else {
            const leaderNames = data.seasonGoalLeaders.map(l => l.new_leader).join(' and ');
            const goals = data.seasonGoalLeaders[0].new_leader_goals || data.seasonGoalLeaders[0].value || 0;
            report += `- ${leaderNames} lead Season goals with ${goals}\n`;
        }
    }
    if (isSecondHalf && data.seasonFantasyLeaders && data.seasonFantasyLeaders.length > 0) {
        ensureLeaderHeader();
        if (data.seasonFantasyLeaders.length === 1) {
            report += `- ${formatLeaderSimple(data.seasonFantasyLeaders[0], 'points', 'Season')}\n`;
        } else {
            const leaderNames = data.seasonFantasyLeaders.map(l => l.new_leader).join(' and ');
            const points = data.seasonFantasyLeaders[0].new_leader_points || data.seasonFantasyLeaders[0].value || 0;
            report += `- ${leaderNames} lead Season points with ${points}\n`;
        }
    }

    return report;
  };

  const handleCopyMatchReport = async () => {
    if (!matchData) return;
    const reportText = formatMatchReportForCopy(matchData, personalBestsData, showOnFireConfig, showGrimReaperConfig);

    try {
      await navigator.clipboard.writeText(reportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy match report: ', err);
    }
  };

  const renderPlayerName = (playerName: string) => {
    const playerId = getPlayerIdByName(playerName);
    return (
      <span className="flex items-center text-sm text-slate-700">
        {playerName}
        {showOnFireConfig && playerId === matchData?.on_fire_player_id && (
          <FireIcon className="w-4 h-4 ml-1 text-green-500" />
        )}
        {showGrimReaperConfig && playerId === matchData?.grim_reaper_player_id && (
          <GrimReaperIcon className="w-6 h-6 ml-1 text-black" />
        )}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
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
        <div className="p-4">
          <div className="text-center">
            <p className="text-slate-500">No recent match data available</p>
          </div>
        </div>
      </div>
    );
  }

  const { matchInfo } = matchData;
  
  return (
    <div className="animate-fade-in-up relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-6">
      <div className="flex justify-between items-center mb-6">
        <h6 className="font-bold text-lg text-slate-700">Latest Match Result</h6>
        <div className="flex items-center text-sm text-slate-500">
          <i className="fas fa-calendar-alt text-slate-400 mr-2"></i>
          <span suppressHydrationWarning>{formatDateSafely(matchInfo.match_date)}</span>
        </div>
      </div>
      
      <div className="flex justify-center items-center gap-8 mb-6">
        <div className="transition-soft transform hover:scale-105 hover:shadow-soft-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-700 to-pink-500 text-white flex items-center justify-center shadow-soft-md">
            <span className="text-xl font-bold">A</span>
          </div>
          <h6 className="mt-2 text-sm font-semibold text-slate-700">{teamAName}</h6>
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-slate-800">
            {matchInfo.team_a_score} - {matchInfo.team_b_score}
          </h1>
          <p className="mt-0.5 text-sm uppercase text-slate-400 font-semibold">FINAL SCORE</p>
        </div>

        <div className="transition-soft transform hover:scale-105 hover:shadow-soft-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-700 to-pink-500 text-white flex items-center justify-center shadow-soft-md">
            <span className="text-xl font-bold">B</span>
          </div>
          <h6 className="mt-2 text-sm font-semibold text-slate-700">{teamBName}</h6>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-100 p-4">
          <h6 className="text-sm font-bold mb-4 text-slate-700">{teamAName}</h6>
          
          <div className="flex flex-col space-y-2">
            {matchInfo.team_a_players.map((player, index) => (
              <div key={index} className="flex items-center">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </div>
                {renderPlayerName(player)}
              </div>
            ))}
          </div>
          
          {matchInfo.team_a_scorers && (
            <div className="mt-4 flex items-start">
              <i className="ni ni-football text-purple-600 mr-2 text-lg"></i>
              <div className="text-sm text-slate-600">
                {matchInfo.team_a_scorers}
              </div>
            </div>
          )}
        </div>
        
        <div className="rounded-xl border border-slate-100 p-4">
          <h6 className="text-sm font-bold mb-4 text-slate-700">{teamBName}</h6>
          
          <div className="flex flex-col space-y-2">
            {matchInfo.team_b_players.map((player, index) => (
              <div key={index} className="flex items-center">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </div>
                {renderPlayerName(player)}
              </div>
            ))}
          </div>
          
          {matchInfo.team_b_scorers && (
            <div className="mt-4 flex items-start">
              <i className="ni ni-football text-purple-600 mr-2 text-lg"></i>
              <div className="text-sm text-slate-600">
                {matchInfo.team_b_scorers}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          variant={copySuccess ? "primary" : "secondary"}
          className={`rounded-lg ${copySuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : "shadow-soft-md"}`}
          onClick={handleCopyMatchReport}
          disabled={!matchData || loading}
        >
          {copySuccess ? 'Copied Report!' : 'Copy Match Report'}
        </Button>
      </div>
    </div>
  );
};

export default LatestMatch; 