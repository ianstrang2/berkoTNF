'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Button from '@/components/ui-kit/Button.component';
import FireIcon from '@/components/icons/FireIcon.component';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon.component';
import { LeaderData, formatLeaderText } from '@/utils/timeline.util';
import { PlayerProfile } from '@/types/player.types';
import { FeatBreakingItem, generateFeatContent } from '@/types/feat-breaking.types';
import { getFeatIcon } from '@/components/icons/FeatIcons.component';
import { useMatchReport } from '@/hooks/queries/useMatchReport.hook';
import { usePlayers } from '@/hooks/queries/usePlayers.hook';
import { usePersonalBests } from '@/hooks/queries/usePersonalBests.hook';
import { useAppConfig } from '@/hooks/queries/useAppConfig.hook';

interface PersonalBestsData {
  broken_pbs_data: {
    [playerId: string]: {
      name: string;
      pbs: {
        metric_type: string;
        value: number;
      }[];
    };
  };
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

const PB_METRIC_DETAILS_FOR_COPY: { [key: string]: { name: string; unit: string } } = {
  'most_goals_in_game': { name: 'Most Goals in Game', unit: 'goals' },
  'longest_win_streak': { name: 'Longest Win Streak', unit: 'games' },
  'longest_undefeated_streak': { name: 'Longest Undefeated Streak', unit: 'games' },
  'longest_losing_streak': { name: 'Longest Losing Streak', unit: 'games' },
  'longest_winless_streak': { name: 'Longest Winless Streak', unit: 'games' },
  'attendance_streak': { name: 'Attendance Streak', unit: 'games' },
};

const LatestMatch: React.FC = () => {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // React Query hooks - automatic caching and deduplication!
  const { data: matchData, isLoading: matchLoading, error: matchError } = useMatchReport();
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers();
  const { data: personalBestsData, isLoading: pbLoading } = usePersonalBests();
  const { data: configData = [], isLoading: configLoading } = useAppConfig('match_settings');

  // Extract config values
  const teamAName = useMemo(() => {
    const config = configData.find(c => c.config_key === 'team_a_name');
    return config?.config_value || 'Team A';
  }, [configData]);

  const teamBName = useMemo(() => {
    const config = configData.find(c => c.config_key === 'team_b_name');
    return config?.config_value || 'Team B';
  }, [configData]);

  const showOnFireConfig = useMemo(() => {
    const config = configData.find(c => c.config_key === 'show_on_fire');
    return config?.config_value !== 'false';
  }, [configData]);

  const showGrimReaperConfig = useMemo(() => {
    const config = configData.find(c => c.config_key === 'show_grim_reaper');
    return config?.config_value !== 'false';
  }, [configData]);

  // Combined loading state
  const loading = matchLoading || playersLoading || pbLoading || configLoading;
  const error = matchError;

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

  const getPlayerByName = (name: string) => {
    return allPlayers.find(p => p.name === name);
  };

  const getPlayerIdByName = (name: string): string | undefined => {
    const player = getPlayerByName(name);
    return player?.id;
  };

  const formatLeaderText = (leaderData: LeaderData, metric: 'goals' | 'points', period: string): string => {
    if (!leaderData || !leaderData.new_leader) {
      return `Unknown leader in ${metric}`;
    }
    
    const { change_type, new_leader, previous_leader } = leaderData;
    
    const value = metric === 'goals' 
      ? (leaderData.new_leader_goals || leaderData.value || 0) 
      : (leaderData.new_leader_points || leaderData.value || 0);
    
    const metricLabel = metric === 'goals' ? 'goals' : 'points';
    const leadText = period.includes('goals') || period.includes('points') ? period : `${period} ${metricLabel}`;
          
    if (!change_type && new_leader) {
      return `${new_leader} leads ${leadText} with ${value}`;
    }
    
    switch (change_type) {
      case 'new_leader':
        return `${new_leader} now leads ${leadText} with ${value}`;
      case 'tied':
        return `${new_leader} tied with ${previous_leader} for ${leadText} at ${value}`;
      case 'remains':
        return `${new_leader} leads ${leadText} with ${value}`;
      case 'overtake':
        return `${new_leader} overtook ${previous_leader} for ${leadText} with ${value}`;
      default:
        return `${new_leader} leads ${leadText} with ${value}`;
    }
  };

  const formatMatchReportForCopy = (
    data: typeof matchData, 
    pbsData: PersonalBestsData | null | undefined,
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

    // Personal Bests
    let personalBestsContent = '';
    if (pbsData && pbsData.broken_pbs_data && Object.keys(pbsData.broken_pbs_data).length > 0) {
      const matchPlayers = [...(matchInfo.team_a_players || []), ...(matchInfo.team_b_players || [])];
      
      const filteredPbsData = Object.values(pbsData.broken_pbs_data).filter((playerPbData: { name: string; pbs: { metric_type: string; value: number }[] }) => 
        matchPlayers.includes(playerPbData.name)
      );
      
      if (filteredPbsData.length > 0) {
        personalBestsContent += `PERSONAL BESTS:\n`;
        filteredPbsData.forEach((playerPbData: { name: string; pbs: { metric_type: string; value: number }[] }) => {
          playerPbData.pbs.forEach(pb => {
            const metricDetail = PB_METRIC_DETAILS_FOR_COPY[pb.metric_type];
            if (metricDetail) {
              personalBestsContent += `- ${playerPbData.name}: ${metricDetail.name} - ${pb.value} ${metricDetail.unit}\n`;
            } else {
              personalBestsContent += `- ${playerPbData.name}: ${pb.metric_type.replace(/_/g, ' ')} - ${pb.value}\n`;
            }
          });
        });
        personalBestsContent += `\n`;
      }
    }

    // CURRENT STANDINGS SECTION
    let hasStandingsData = false;
    let standingsSection = '';

    const formatStandingsList = (title: string, items: any[] | undefined, formatter: (item: any) => string) => {
      if (items && items.length > 0) {
        if (!hasStandingsData) {
          standingsSection += `\n--- CURRENT STANDINGS ---\n`;
          hasStandingsData = true;
        }
        
        const valueGroups: { [key: number]: any[] } = {};
        items.forEach(item => {
          const isGoals = title.toLowerCase().includes('goal');
          const value = isGoals 
            ? (item.new_leader_goals || item.value || 0)
            : (item.new_leader_points || item.value || 0);
          
          if (!valueGroups[value]) {
            valueGroups[value] = [];
          }
          valueGroups[value].push(item);
        });
        
        Object.values(valueGroups).forEach(group => {
          if (group.length === 1) {
            standingsSection += `- ${formatter(group[0])}\n`;
          } else {
            const firstItem = group[0];
            const isGoals = title.toLowerCase().includes('goal');
            const value = isGoals 
              ? (firstItem.new_leader_goals || firstItem.value || 0)
              : (firstItem.new_leader_points || firstItem.value || 0);
            
            const leaderNames = group.map(item => item.new_leader);
            const namesText = leaderNames.length === 2 
              ? leaderNames.join(' and ')
              : leaderNames.slice(0, -1).join(', ') + ', and ' + leaderNames[leaderNames.length - 1];
            
            const period = title.replace(' Goal Leaders', '').replace(' Fantasy Leaders', '');
            const metric = isGoals ? 'goals' : 'points';
            
            standingsSection += `- ${namesText} are tied for the ${period} ${metric} lead with ${value}\n`;
          }
        });
      }
    };

    formatStandingsList('Half-Season Goal Leaders', data.halfSeasonGoalLeaders, item => formatLeaderText(item, 'goals', 'Half-Season'));
    formatStandingsList('Half-Season Fantasy Leaders', data.halfSeasonFantasyLeaders, item => formatLeaderText(item, 'points', 'Half-Season'));
    
    const currentDate = matchInfo.match_date ? new Date(matchInfo.match_date) : new Date();
    const isSecondHalf = currentDate.getMonth() >= 6;
    
    if (isSecondHalf) {
      formatStandingsList('Season Goal Leaders', data.seasonGoalLeaders, item => formatLeaderText(item, 'goals', 'Season'));
      formatStandingsList('Season Fantasy Leaders', data.seasonFantasyLeaders, item => formatLeaderText(item, 'points', 'Season'));
    }
    
    if (hasStandingsData) {
      report += standingsSection;
    }

    // CURRENT FORM SECTION
    let hasCurrentFormData = false;
    let currentFormSection = '';
    
    if (data.grim_reaper_player_id || data.on_fire_player_id) {
      if (!hasCurrentFormData) {
        currentFormSection += `\n--- CURRENT FORM ---\n`;
        hasCurrentFormData = true;
      }
      
      if (showGrimReaperUi && data.grim_reaper_player_id && allPlayers.length > 0) {
        const reaperPlayer = allPlayers.find(p => p.id === data.grim_reaper_player_id);
        if (reaperPlayer) {
          currentFormSection += `- ${reaperPlayer.name} is The Grim Reaper 💀\n`;
        }
      }
      
      if (showOnFireUi && data.on_fire_player_id && allPlayers.length > 0) {
        const onFirePlayer = allPlayers.find(p => p.id === data.on_fire_player_id);
        if (onFirePlayer) {
          currentFormSection += `- ${onFirePlayer.name} is On Fire! 🔥\n`;
        }
      }
    }
    
    if (data.streaks && data.streaks.length > 0) {
      const matchPlayers = [...(matchInfo.team_a_players || []), ...(matchInfo.team_b_players || [])];
      const filteredStreaks = data.streaks.filter(streak => matchPlayers.includes(streak.name));
      
      if (filteredStreaks.length > 0) {
        if (!hasCurrentFormData) {
          currentFormSection += `\n--- CURRENT FORM ---\n`;
          hasCurrentFormData = true;
        }
        filteredStreaks.forEach(streak => {
          const streakType = 
            streak.streak_type === 'win' ? 'winning' :
            streak.streak_type === 'loss' ? 'losing' :
            streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless';
          
          currentFormSection += `- ${streak.name}: ${streak.streak_count} game ${streakType} streak\n`;
        });
      }
    }

    if (data.goalStreaks && data.goalStreaks.length > 0) {
      const matchPlayers = [...(matchInfo.team_a_players || []), ...(matchInfo.team_b_players || [])];
      const filteredGoalStreaks = data.goalStreaks.filter(streak => matchPlayers.includes(streak.name));
      
      if (filteredGoalStreaks.length > 0) {
        if (!hasCurrentFormData) {
          currentFormSection += `\n--- CURRENT FORM ---\n`;
          hasCurrentFormData = true;
        }
        filteredGoalStreaks.forEach(streak => {
          currentFormSection += `- ${streak.name}: Scored in ${streak.matches_with_goals} consecutive matches (${streak.goals_in_streak} goals)\n`;
        });
      }
    }
    
    if (hasCurrentFormData) {
      report += currentFormSection;
    }

    // RECORDS & ACHIEVEMENTS SECTION
    let hasRecordsData = false;
    let recordsSection = '';
    
    if (personalBestsContent) {
      recordsSection += `\n--- RECORDS & ACHIEVEMENTS ---\n`;
      recordsSection += personalBestsContent;
      hasRecordsData = true;
    }
    
    if ((data.gamesMilestones && data.gamesMilestones.length > 0) || 
        (data.goalsMilestones && data.goalsMilestones.length > 0)) {
      const matchPlayers = [...(matchInfo.team_a_players || []), ...(matchInfo.team_b_players || [])];
      
      const filteredGameMilestones = data.gamesMilestones?.filter(m => matchPlayers.includes(m.name)) || [];
      const filteredGoalMilestones = data.goalsMilestones?.filter(m => matchPlayers.includes(m.name)) || [];
      
      if (filteredGameMilestones.length > 0 || filteredGoalMilestones.length > 0) {
        if (!hasRecordsData) {
          recordsSection += `\n--- RECORDS & ACHIEVEMENTS ---\n`;
          hasRecordsData = true;
        }
        recordsSection += `MILESTONES:\n`;
        
        if (filteredGameMilestones.length > 0) {
          filteredGameMilestones.forEach(m => {
            const gameCount = m.total_games || m.value || 0;
            recordsSection += `- ${m.name}: Played ${getOrdinalSuffix(gameCount)} game\n`;
          });
        }
        
        if (filteredGoalMilestones.length > 0) {
          filteredGoalMilestones.forEach(m => {
            const goalCount = m.total_goals || m.value || 0;
            recordsSection += `- ${m.name}: Scored ${getOrdinalSuffix(goalCount)} goal\n`;
          });
        }
        recordsSection += `\n`;
      }
    }

    if (data.featBreakingData && data.featBreakingData.length > 0) {
      const matchPlayers = [...(matchInfo.team_a_players || []), ...(matchInfo.team_b_players || [])];
      const filteredFeatBreakingData = data.featBreakingData.filter(feat => matchPlayers.includes(feat.player_name));
      
      if (filteredFeatBreakingData.length > 0) {
        if (!hasRecordsData) {
          recordsSection += `\n--- RECORDS & ACHIEVEMENTS ---\n`;
          hasRecordsData = true;
        }
        recordsSection += `RECORD-BREAKING FEATS:\n`;
        filteredFeatBreakingData.forEach(feat => {
          const content = generateFeatContent(feat as FeatBreakingItem);
          recordsSection += `- ${feat.player_name}: ${content}\n`;
        });
      }
    }
    
    if (hasRecordsData) {
      report += recordsSection;
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
    const cleanPlayerName = playerName.replace(/\s*\(\d+\)$/, '').trim();
    const actualPlayer = getPlayerByName(cleanPlayerName);
    const actualPlayerId = actualPlayer?.id;
    const isRinger = actualPlayer?.isRinger;

    const content = (
      <>
        {playerName}
        {showOnFireConfig && actualPlayerId && actualPlayerId === matchData?.on_fire_player_id && (
          <FireIcon className="w-4 h-4 ml-1 text-green-500" />
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

  if (loading && !matchData) {
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
            <p className="text-sm">{(error as Error).message}</p>
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
            <p className="text-sm text-slate-500">No recent match data available</p>
          </div>
        </div>
      </div>
    );
  }

  const { matchInfo } = matchData;
  
  const teamAPlayersWithGoals = getPlayersWithGoals(matchInfo.team_a_players, matchInfo.team_a_scorers);
  const teamBPlayersWithGoals = getPlayersWithGoals(matchInfo.team_b_players, matchInfo.team_b_scorers);
  
  const teamAColumns = splitPlayersIntoColumns(teamAPlayersWithGoals);
  const teamBColumns = splitPlayersIntoColumns(teamBPlayersWithGoals);
  
  return (
    <div className="animate-fade-in-up relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-3 sm:p-4 lg:p-6">
      {/* Date above score */}
      <div className="text-center mb-3 sm:mb-4">
        <div className="flex items-center justify-center text-xs sm:text-sm text-slate-500">
          <i className="fas fa-calendar-alt text-slate-400 mr-1 sm:mr-2"></i>
          <span suppressHydrationWarning>{formatDateSafely(matchInfo.match_date)}</span>
        </div>
      </div>
      
      {/* Score section */}
      <div className="flex items-center justify-center gap-8 sm:gap-12 lg:gap-16 mb-4 sm:mb-6">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-tl from-purple-700 to-pink-500 text-white flex items-center justify-center shadow-soft-md">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold">A</span>
          </div>
          <h6 className="mt-2 text-sm sm:text-base font-semibold text-slate-700 text-center px-1">{teamAName}</h6>
        </div>

        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-800">
            {matchInfo.team_a_score} - {matchInfo.team_b_score}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm uppercase text-slate-400 font-semibold">FINAL SCORE</p>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-tl from-purple-700 to-pink-500 text-white flex items-center justify-center shadow-soft-md">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold">B</span>
          </div>
          <h6 className="mt-2 text-sm sm:text-base font-semibold text-slate-700 text-center px-1">{teamBName}</h6>
        </div>
      </div>
      
      {/* Players */}
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="text-right pr-2">
          {[...teamAColumns.leftColumn, ...teamAColumns.rightColumn].map((player, index) => (
            <div key={index} className="text-sm sm:text-base text-slate-700 mb-2">
              {renderPlayerName(player)}
            </div>
          ))}
        </div>
        
        <div className="text-left pl-2">
          {[...teamBColumns.leftColumn, ...teamBColumns.rightColumn].map((player, index) => (
            <div key={index} className="text-sm sm:text-base text-slate-700 mb-2">
              {renderPlayerName(player)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 sm:mt-6 lg:mt-8 flex justify-center">
        <Button
          variant={copySuccess ? "primary" : "secondary"}
          className={`rounded-lg text-sm ${copySuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : "shadow-soft-md"}`}
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
