'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PlayerProfile } from '@/types/player.types';

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

interface MilestonesData {
  matchInfo: {
    match_date: string;
  };
  gamesMilestones?: Milestone[];
  goalsMilestones?: Milestone[];
  streaks?: Streak[];
  goalStreaks?: GoalStreak[];
  halfSeasonGoalLeaders?: LeaderData[];
  halfSeasonFantasyLeaders?: LeaderData[];
  seasonGoalLeaders?: LeaderData[];
  seasonFantasyLeaders?: LeaderData[];
}

const Milestones: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [milestonesData, setMilestonesData] = useState<MilestonesData | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerProfile[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);

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

  // Helper function to get the correct ordinal suffix for numbers
  const getOrdinalSuffix = (num: number): string => {
    // Handle case where num is 0, which isn't a valid ordinal
    if (num === 0) {
      console.error('Invalid ordinal number: 0');
      return "0th"; // Return something reasonable but log error
    }
    
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

  // Format date safely
  const formatDateSafely = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Use toLocaleDateString with explicit locale for consistency
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

  // Helper function to format leader data text with improved handling
  const formatLeaderText = (leaderData: LeaderData, metric: 'goals' | 'points', period: string): string => {
    if (!leaderData || !leaderData.new_leader) {
      console.error('Invalid leader data:', leaderData);
      return `Unknown leader in ${metric}`;
    }
    
    const { change_type, new_leader, previous_leader } = leaderData;
    
    const value = metric === 'goals' 
      ? (leaderData.new_leader_goals || leaderData.value || 0) 
      : (leaderData.new_leader_points || leaderData.value || 0);
          
    // If we don't have a change_type but do have a name and value, use concise format
    // This case might not be strictly needed if data always has change_type from SQL
    if (!change_type && new_leader) {
      return `${new_leader} leads with ${value}`;
    }
    
    switch (change_type) {
      case 'new_leader':
        return `${new_leader} now leads with ${value}`;
      case 'tied':
        // For UI, if we ever have a 'tied' type for a single leader item, this should be clear.
        // However, 'tied' type from SQL usually means a new person tied a previous leader's score.
        // If it's about current co-leaders, that's handled separately now.
        return `${new_leader} tied with ${previous_leader} at ${value}`;
      case 'remains':
        return `${new_leader} leads with ${value}`;
      case 'overtake':
        return `${new_leader} overtook ${previous_leader} with ${value}`;
      default:
        return `${new_leader} leads with ${value}`;
    }
  };

  const fetchMilestonesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch milestones and players in parallel
      const [milestonesResponse, playersResponse] = await Promise.all([
        fetch('/api/matchReport'), // This API seems to provide all milestone data
        fetch('/api/players')
      ]);
      
      if (!milestonesResponse.ok) {
        const errorText = await milestonesResponse.text();
        throw new Error(`Milestones API error: ${milestonesResponse.status} - ${errorText || 'No details'}`);
      }
      const milestonesResult = await milestonesResponse.json();
      
      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        // No transformation needed, API provides canonical PlayerProfile objects.
        setAllPlayers(playersData.data || []);
      } else {
        // Non-critical, milestones can still be shown without player links
        console.warn('Failed to fetch players for Milestones component');
        setAllPlayers([]);
      }
      
      if (milestonesResult.success) {
        setMilestonesData(milestonesResult.data);
        processTimelineItems(milestonesResult.data);
      } else {
        setError(new Error(milestonesResult.error || 'Failed to fetch milestones data'));
      }
    } catch (error) {
      console.error('Error in fetchMilestonesData:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch milestones data'));
    } finally {
      setLoading(false);
    }
  };

  const getPlayerIdByName = (name: string): string | undefined => {
    const player = allPlayers.find(p => p.name === name);
    return player?.id;
  };

  const processTimelineItems = (data: MilestonesData) => {
    const items: TimelineItem[] = [];
    const matchDate = data.matchInfo.match_date ? formatDateSafely(data.matchInfo.match_date) : '';
    
    // Add game milestones to timeline
    if (data.gamesMilestones && data.gamesMilestones.length > 0) {
      data.gamesMilestones.forEach(milestone => {
        const gameCount = milestone.total_games || milestone.value || 0;
        const playerId = getPlayerIdByName(milestone.name);
        items.push({
          type: 'game_milestone',
          player: milestone.name,
          playerId: playerId,
          content: `Played ${getOrdinalSuffix(gameCount)} game`,
          icon: 'trophy',
          date: matchDate,
          color: 'blue'
        });
      });
    }
    
    // Add goal milestones to timeline
    if (data.goalsMilestones && data.goalsMilestones.length > 0) {
      data.goalsMilestones.forEach(milestone => {
        const goalCount = milestone.total_goals || milestone.value || 0;
        const playerId = getPlayerIdByName(milestone.name);
        items.push({
          type: 'goal_milestone',
          player: milestone.name,
          playerId: playerId,
          content: `Scored ${getOrdinalSuffix(goalCount)} goal`,
          icon: 'goal',
          date: matchDate,
          color: 'blue'
        });
      });
    }
    
    // Add form streaks to timeline - Match icon colors with badge colors
    if (data.streaks && data.streaks.length > 0) {
      data.streaks.forEach(streak => {
        const streakType = 
          streak.streak_type === 'win' ? 'winning' :
          streak.streak_type === 'loss' ? 'losing' :
          streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless';
        
        // Assign appropriate colors based on streak type
        const streakColor = 
          streak.streak_type === 'win' || streak.streak_type === 'unbeaten' ? 'green' : 'red';
        
        const playerId = getPlayerIdByName(streak.name);
        items.push({
          type: 'form_streak',
          player: streak.name,
          playerId: playerId,
          content: `${streak.streak_count} game ${streakType} streak`,
          icon: streak.streak_type === 'win' || streak.streak_type === 'unbeaten' ? 'fire' : 'chart',
          date: matchDate,
          color: streakColor
        });
      });
    }
    
    // Add goal streaks to timeline
    if (data.goalStreaks && data.goalStreaks.length > 0) {
      data.goalStreaks.forEach(streak => {
        const playerId = getPlayerIdByName(streak.name);
        items.push({
          type: 'goal_streak',
          player: streak.name,
          playerId: playerId,
          content: `Scored in ${streak.matches_with_goals} consecutive matches`,
          subtext: `${streak.goals_in_streak} goals in those games`,
          icon: 'soccer',
          date: matchDate,
          color: 'green'
        });
      });
    }
    
    // Add current leader changes with improved handling
    if (data.halfSeasonGoalLeaders && data.halfSeasonGoalLeaders.length > 0) {
      const leaders = data.halfSeasonGoalLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        // Single leader
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
        // Co-leaders - create ONE entry for all tied leaders
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const goals = firstLeader.new_leader_goals || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${goals}.`;
        
        // Create only ONE timeline entry for all tied leaders
        items.push({
          type: 'leader_change',
          player: 'Half-Season Goals',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
          // No playerId since this represents multiple players
        });
      }
    }
    
    if (data.halfSeasonFantasyLeaders && data.halfSeasonFantasyLeaders.length > 0) {
      const leaders = data.halfSeasonFantasyLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        // Single leader
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
        // Co-leaders - create ONE entry for all tied leaders
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const points = firstLeader.new_leader_points || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${points}.`;
        
        // Create only ONE timeline entry for all tied leaders
        items.push({
          type: 'leader_change',
          player: 'Half-Season Points',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
          // No playerId since this represents multiple players
        });
      }
    }
    
    // Only show season leaders in the second half of the year (Jul-Dec)
    const currentDate = data.matchInfo.match_date ? new Date(data.matchInfo.match_date) : new Date();
    const isSecondHalf = currentDate.getMonth() >= 6; // getMonth() is 0-based, so 6 = July
    
    if (isSecondHalf && data.seasonGoalLeaders && data.seasonGoalLeaders.length > 0) {
      const leaders = data.seasonGoalLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        // Single leader
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
        // Co-leaders - create ONE entry for all tied leaders
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const goals = firstLeader.new_leader_goals || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${goals}.`;
        
        // Create only ONE timeline entry for all tied leaders
        items.push({
          type: 'leader_change',
          player: 'Season Goals',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
          // No playerId since this represents multiple players
        });
      }
    }
    
    if (isSecondHalf && data.seasonFantasyLeaders && data.seasonFantasyLeaders.length > 0) {
      const leaders = data.seasonFantasyLeaders;
      const firstLeader = leaders[0];

      if (leaders.length === 1) {
        // Single leader
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
        // Co-leaders - create ONE entry for all tied leaders
        const leaderNames = leaders.length === 2 
          ? leaders.map(l => l.new_leader).join(' and ')
          : leaders.slice(0, -1).map(l => l.new_leader).join(', ') + ', and ' + leaders[leaders.length - 1].new_leader;
        const points = firstLeader.new_leader_points || firstLeader.value || 0;
        const content = `${leaderNames} are tied for the lead with ${points}.`;
        
        // Create only ONE timeline entry for all tied leaders
        items.push({
          type: 'leader_change',
          player: 'Season Points',
          content: content,
          icon: 'crown',
          date: matchDate,
          color: 'amber'
          // No playerId since this represents multiple players
        });
      }
    }
    
    setTimelineItems(items);
  };

  useEffect(() => {
    fetchMilestonesData();
  }, []);

  useEffect(() => {
    if (milestonesData) {
      processTimelineItems(milestonesData);
    }
  }, [milestonesData, allPlayers]);

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Loading milestones...</p>
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
            <p>Error loading milestones</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="p-4">
          <div className="text-center">
            <p className="text-neutral-500">No milestones or achievements to display</p>
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
        <h5 className="mb-0">Milestones & Achievements</h5>
      </div>
      <div className="flex-auto p-4">
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
                  {item.icon === 'trophy' && (
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  )}
                  {item.icon === 'goal' && (
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  {item.icon === 'fire' && (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  )}
                  {item.icon === 'chart' && (
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  )}
                  {item.icon === 'soccer' && (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                    </svg>
                  )}
                  {item.icon === 'crown' && (
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </span>

                <div className="ml-12 pt-1.4 max-w-120 relative -top-1.5 w-auto">
                  <h6 className="mb-0 font-semibold leading-normal text-sm text-slate-700">
                    {item.playerId && (item.type === 'game_milestone' || item.type === 'goal_milestone' || item.type === 'form_streak' || item.type === 'goal_streak') ? (
                      <Link href={`/players/${item.playerId}`} className="hover:underline">
                        {item.player}
                      </Link>
                    ) : (
                      item.player
                    )}
                    <span className="ml-2 text-xs font-normal text-slate-500">{item.date}</span>
                  </h6>
                  <p className="mt-1 mb-1 leading-normal text-sm text-slate-600">{item.content}</p>
                  {item.subtext && (
                    <p className="mb-2 leading-normal text-xs text-slate-500">{item.subtext}</p>
                  )}
                  
                  {/* Colored badges with matching icon colors */}
                  {item.type === 'game_milestone' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-blue-600 to-cyan-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Milestone</span>
                  )}
                  {item.type === 'goal_milestone' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-blue-600 to-cyan-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Milestone</span>
                  )}
                  {item.type === 'form_streak' && item.color === 'green' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-green-600 to-lime-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Streak</span>
                  )}
                  {item.type === 'form_streak' && item.color === 'red' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-red-600 to-rose-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Streak</span>
                  )}
                  {item.type === 'goal_streak' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-green-600 to-lime-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Scoring Streak</span>
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