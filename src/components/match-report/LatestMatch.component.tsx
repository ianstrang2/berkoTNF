'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui-kit/Button.component';

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

const LatestMatch: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [matchData, setMatchData] = useState<FullMatchReportData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [teamAName, setTeamAName] = useState<string>('Team A');
  const [teamBName, setTeamBName] = useState<string>('Team B');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

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

  const fetchTeamNames = async () => {
    try {
      const response = await fetch('/api/admin/app-config?group=match_settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const teamAConfig = data.data.find((config: any) => config.config_key === 'team_a_name');
          const teamBConfig = data.data.find((config: any) => config.config_key === 'team_b_name');
          
          if (teamAConfig && teamAConfig.config_value) {
            setTeamAName(teamAConfig.config_value);
          }
          
          if (teamBConfig && teamBConfig.config_value) {
            setTeamBName(teamBConfig.config_value);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team names:', error);
    }
  };

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/matchReport');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText || 'No details'}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMatchData(result.data);
      } else {
        setError(new Error(result.error || 'Failed to fetch match data'));
      }
    } catch (error) {
      console.error('Error in fetchMatchData:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch match data'));
    } finally {
      setLoading(false);
    }
  };

  const formatMatchReportForCopy = (data: FullMatchReportData | null): string => {
    if (!data || !data.matchInfo) return 'No match data available.';

    const {
      matchInfo,
      gamesMilestones,
      goalsMilestones,
      streaks,
      goalStreaks,
      halfSeasonGoalLeaders,
      halfSeasonFantasyLeaders,
      seasonGoalLeaders,
      seasonFantasyLeaders,
    } = data;

    let report = `⚽️ MATCH REPORT: ${formatDateSafely(matchInfo.match_date)} ⚽️\n\n`;
    report += `FINAL SCORE: ${teamAName} ${matchInfo.team_a_score} - ${matchInfo.team_b_score} ${teamBName}\n\n`;

    report += `--- ${teamAName.toUpperCase()} ---\n`;
    report += `Players: ${matchInfo.team_a_players.join(', ')}\n`;
    if (matchInfo.team_a_scorers) {
      report += `Scorers: ${matchInfo.team_a_scorers}\n`;
    }
    report += `\n--- ${teamBName.toUpperCase()} ---\n`;
    report += `Players: ${matchInfo.team_b_players.join(', ')}\n`;
    if (matchInfo.team_b_scorers) {
      report += `Scorers: ${matchInfo.team_b_scorers}\n`;
    }

    const formatList = (title: string, items: any[] | undefined, formatter: (item: any) => string) => {
      if (items && items.length > 0) {
        report += `\n--- ${title.toUpperCase()} ---\n`;
        items.forEach(item => {
          report += `- ${formatter(item)}\n`;
        });
      }
    };

    formatList('Game Milestones', gamesMilestones, item => `${item.name}: Played ${getOrdinalSuffix(item.total_games || item.value || 0)} game`);
    formatList('Goal Milestones', goalsMilestones, item => `${item.name}: Scored ${getOrdinalSuffix(item.total_goals || item.value || 0)} goal`);
    formatList('Form Streaks', streaks, item => `${item.name}: ${item.streak_count} game ${item.streak_type === 'win' ? 'winning' : item.streak_type === 'loss' ? 'losing' : item.streak_type === 'unbeaten' ? 'unbeaten' : 'winless'} streak`);
    formatList('Goal Scoring Streaks', goalStreaks, item => `${item.name}: Scored in ${item.matches_with_goals} consecutive matches (${item.goals_in_streak} goals)`);
    
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

    if (halfSeasonGoalLeaders?.[0]) {
        ensureLeaderHeader();
        report += `- ${formatLeaderSimple(halfSeasonGoalLeaders[0], 'goals', 'Half-Season')}\n`;
    }
    if (halfSeasonFantasyLeaders?.[0]) {
        ensureLeaderHeader();
        report += `- ${formatLeaderSimple(halfSeasonFantasyLeaders[0], 'points', 'Half-Season')}\n`;
    }

    const currentDate = matchInfo.match_date ? new Date(matchInfo.match_date) : new Date();
    const isSecondHalf = currentDate.getMonth() >= 6;

    if (isSecondHalf && seasonGoalLeaders?.[0]) {
        ensureLeaderHeader();
        report += `- ${formatLeaderSimple(seasonGoalLeaders[0], 'goals', 'Season')}\n`;
    }
    if (isSecondHalf && seasonFantasyLeaders?.[0]) {
        ensureLeaderHeader();
        report += `- ${formatLeaderSimple(seasonFantasyLeaders[0], 'points', 'Season')}\n`;
    }

    return report;
  };

  const handleCopyMatchReport = async () => {
    if (!matchData) return;

    const reportText = formatMatchReportForCopy(matchData);

    try {
      await navigator.clipboard.writeText(reportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy match report: ', err);
    }
  };

  useEffect(() => {
    fetchMatchData();
    fetchTeamNames();
  }, []);

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
          
          <div className="space-y-2">
            {matchInfo.team_a_players.map((player, index) => (
              <li key={`player-a-${index}`} className="animate-fade-in-up delay-100 flex items-center list-none" style={{animationFillMode: 'forwards'}}>
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </div>
                <span className="text-sm text-slate-700">{player}</span>
              </li>
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
          
          <div className="space-y-2">
            {matchInfo.team_b_players.map((player, index) => (
              <li key={`player-b-${index}`} className="animate-fade-in-up delay-100 flex items-center list-none" style={{animationFillMode: 'forwards'}}>
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 flex items-center justify-center text-xs font-semibold mr-3">
                  {index + 1}
                </div>
                <span className="text-sm text-slate-700">{player}</span>
              </li>
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