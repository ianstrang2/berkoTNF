'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PlayerProfile } from '@/types/player.types';
import { useMatchReport } from '@/hooks/queries/useMatchReport.hook';
import { usePlayers } from '@/hooks/queries/usePlayers.hook';

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

interface TimelineItem {
  type: 'game_milestone' | 'goal_milestone' | 'form_streak' | 'goal_streak' | 'leader_change';
  player: string;
  playerId?: string;
  content: string;
  subtext?: string;
  icon: 'trophy' | 'goal' | 'fire' | 'chart' | 'soccer' | 'crown';
  date?: string;
  color?: string;
}

const Milestones: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);

  // React Query hooks - automatic caching and deduplication!
  const { data: milestonesData, isLoading: milestonesLoading, error: milestonesError } = useMatchReport();
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers();

  // Combined loading/error states
  const loading = milestonesLoading || playersLoading;
  const error = milestonesError;

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: 'easeOut',
      },
    }),
  };

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  // Format date safely
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

  // Helper function to format leader data text
  const formatLeaderText = (leaderData: LeaderData, metric: 'goals' | 'points', period: string): string => {
    if (!leaderData || !leaderData.new_leader) {
      console.error('Invalid leader data:', leaderData);
      return `Unknown leader in ${metric}`;
    }
    
    const { change_type, new_leader, previous_leader } = leaderData;
    
    const value = metric === 'goals' 
      ? (leaderData.new_leader_goals || leaderData.value || 0) 
      : (leaderData.new_leader_points || leaderData.value || 0);
          
    if (!change_type && new_leader) {
      return `${new_leader} leads with ${value}`;
    }
    
    switch (change_type) {
      case 'new_leader':
        return `${new_leader} now leads with ${value}`;
      case 'tied':
        return `${new_leader} tied with ${previous_leader} at ${value}`;
      case 'remains':
        return `${new_leader} leads with ${value}`;
      case 'overtake':
        return `${new_leader} overtook ${previous_leader} with ${value}`;
      default:
        return `${new_leader} leads with ${value}`;
    }
  };

  // Don't use useCallback - inline function to avoid dependency issues
  const getPlayerIdByName = (name: string): string | undefined => {
    const player = allPlayers.find(p => p.name === name);
    return player?.id;
  };

  // Helper function to render section headers with appropriate links
  const renderSectionHeader = (sectionName: string): React.ReactNode => {
    const linkMap: { [key: string]: string } = {
      'Half-Season Goals': '/player/table/half?view=goals',
      'Half-Season Points Leader': '/player/table/half',
      'Half-Season Points': '/player/table/half',
      'Season Goals': '/player/table/whole?view=goals',
      'Season Points Leader': '/player/table/whole',
      'Season Points': '/player/table/whole'
    };

    const url = linkMap[sectionName];
    if (url) {
      return (
        <Link href={url} className="hover:underline text-slate-700">
          {sectionName}
        </Link>
      );
    }
    
    return sectionName;
  };

  // Function to render content with player names as links
  const renderContentWithLinks = (content: string): React.ReactNode => {
    if (!allPlayers.length) return content;
    
    const playerNames = allPlayers.map(p => p.name);
    const playerNamePattern = new RegExp(`\\b(${playerNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
    
    const parts = content.split(playerNamePattern);
    const result: React.ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const playerId = getPlayerIdByName(part);
      
      if (playerId) {
        result.push(
          <Link key={i} href={`/player/profiles/${playerId}`} className="hover:underline text-slate-700">
            {part}
          </Link>
        );
      } else {
        result.push(part);
      }
    }
    
    return result;
  };

  const processTimelineItems = (data: typeof milestonesData) => {
    const items: TimelineItem[] = [];
    
    if (!data || !data.matchInfo) {
      setTimelineItems([]);
      return;
    }
    
    const matchDate = data.matchInfo.match_date ? formatDateSafely(data.matchInfo.match_date) : '';
    
    // Add current leader changes
    if (data.halfSeasonGoalLeaders && data.halfSeasonGoalLeaders.length > 0) {
      const leaders = data.halfSeasonGoalLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        const playerId = getPlayerIdByName(firstLeader.new_leader);
        items.push({
          type: 'leader_change',
          player: 'Half-Season Goals',
          content: formatLeaderText(firstLeader, 'goals', 'current Half-Season'),
          icon: 'crown',
          date: matchDate,
          color: 'amber',
          playerId: playerId
        });
      } else {
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const goals = firstLeader.new_leader_goals || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${goals}.`;
        
        items.push({
          type: 'leader_change',
          player: 'Half-Season Goals',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
        });
      }
    }
    
    if (data.halfSeasonFantasyLeaders && data.halfSeasonFantasyLeaders.length > 0) {
      const leaders = data.halfSeasonFantasyLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        const playerId = getPlayerIdByName(firstLeader.new_leader);
        items.push({
          type: 'leader_change',
          player: 'Half-Season Points Leader',
          content: formatLeaderText(firstLeader, 'points', 'current Half-Season'),
          icon: 'crown',
          date: matchDate,
          color: 'amber',
          playerId: playerId
        });
      } else {
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const points = firstLeader.new_leader_points || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${points}.`;
        
        items.push({
          type: 'leader_change',
          player: 'Half-Season Points',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
        });
      }
    }
    
    // Only show season leaders in the second half of the year
    const currentDate = data.matchInfo.match_date ? new Date(data.matchInfo.match_date) : new Date();
    const isSecondHalf = currentDate.getMonth() >= 6;
    
    if (isSecondHalf && data.seasonGoalLeaders && data.seasonGoalLeaders.length > 0) {
      const leaders = data.seasonGoalLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        const playerId = getPlayerIdByName(firstLeader.new_leader);
        items.push({
          type: 'leader_change',
          player: 'Season Goals',
          content: formatLeaderText(firstLeader, 'goals', new Date().getFullYear() + ' Season'),
          icon: 'crown',
          date: matchDate,
          color: 'amber',
          playerId: playerId
        });
      } else {
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const goals = firstLeader.new_leader_goals || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${goals}.`;
        
        items.push({
          type: 'leader_change',
          player: 'Season Goals',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
        });
      }
    }
    
    if (isSecondHalf && data.seasonFantasyLeaders && data.seasonFantasyLeaders.length > 0) {
      const leaders = data.seasonFantasyLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        const playerId = getPlayerIdByName(firstLeader.new_leader);
        items.push({
          type: 'leader_change',
          player: 'Season Points Leader',
          content: formatLeaderText(firstLeader, 'points', new Date().getFullYear() + ' Season'),
          icon: 'crown',
          date: matchDate,
          color: 'amber',
          playerId: playerId
        });
      } else {
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const points = firstLeader.new_leader_points || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${points}.`;
        
        items.push({
          type: 'leader_change',
          player: 'Season Points',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
        });
      }
    }
    
    setTimelineItems(items);
  };

  useEffect(() => {
    if (milestonesData && !playersLoading) {
      processTimelineItems(milestonesData);
    }
  }, [milestonesData, allPlayers.length, playersLoading]);

  // AFTER all hooks - check loading/error states
  // Only show loading spinner if we have NO data yet (stale-while-revalidate)
  if (loading && timelineItems.length === 0) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Current Standings</h5>
        </div>
        <div className="p-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Loading standings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Current Standings</h5>
        </div>
        <div className="p-4">
          <div className="text-center text-red-500">
            <p>Error loading standings</p>
            <p className="text-sm">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Current Standings</h5>
        </div>
        <div className="p-4">
          <div className="text-center">
            <p className="text-sm text-slate-500">No current standings data to display</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border"
    >
             <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
         <h5 className="mb-0">Current Standings</h5>
       </div>
      <div className="flex-auto px-4 pb-4 pt-2">
        <div className="overflow-x-auto px-0 pt-0 pb-2 ps">
          <div className="w-auto relative before:absolute before:left-4 before:top-0 before:h-full before:border-r-2 before:border-solid before:border-slate-100 before:content-[''] lg:before:-ml-px">
            {timelineItems.map((item, index) => (
              <motion.div 
                key={`timeline-${index}`} 
                custom={index}
                variants={cardVariants}
                className="relative mb-4 last:mb-0"
              >
                <span className="w-8 h-8 rounded-full text-base z-1 absolute left-4 inline-flex -translate-x-1/2 items-center justify-center bg-white text-center font-semibold">
                  {item.icon === 'crown' && (
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </span>

                <div className="ml-12 pt-1.4 max-w-120 relative -top-1.5 w-auto">
                  <h6 className="mb-0 font-semibold leading-normal text-sm text-slate-700">
                    {item.type === 'leader_change' ? (
                      renderSectionHeader(item.player)
                    ) : item.playerId ? (
                      <Link href={`/player/profiles/${item.playerId}`} className="hover:underline">
                        {item.player}
                      </Link>
                    ) : (
                      item.player
                    )}
                    <span className="ml-2 text-xs font-normal text-slate-500">{item.date}</span>
                  </h6>
                  <p className="mt-1 mb-1 leading-normal text-sm text-slate-600">{renderContentWithLinks(item.content)}</p>
                  {item.subtext && (
                    <p className="mb-2 leading-normal text-xs text-slate-500">{item.subtext}</p>
                  )}
                  
                  {item.type === 'leader_change' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-amber-600 to-yellow-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Leaderboard</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Milestones;
