'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PersonalBestsAPIResponseData as PersonalBestsData } from '@/types/personal-bests.types';
import { FeatBreakingItem, generateFeatContent } from '@/types/feat-breaking.types';
import Link from 'next/link';

// Interfaces for milestones
interface Milestone {
  name: string;
  games_played?: number;
  total_games?: number;
  total_goals?: number;
  value?: number;
}

// Interface for individual timeline items (expanded for all three types)
interface TimelineItem {
  type: 'personal_best_broken' | 'game_milestone' | 'goal_milestone' | 'feat_broken' | 'feat_equaled';
  player: string;
  playerId: number | string;
  content: string;
  subtext?: string;
  icon: 'goals' | 'win_streak' | 'undefeated_streak' | 'loss_streak' | 'winless_streak' | 'attendance_streak' | 'scoring_streak' | 'trophy' | 'goal'; 
  date?: string;
  color?: 'green' | 'red' | 'blue' | 'amber' | 'purple';
}

// Mapping personal best types to their display details
const PB_METRIC_DETAILS: { 
  [key: string]: { 
    name: string; 
    icon: TimelineItem['icon']; // Use the icon keys defined above
    color: TimelineItem['color']; 
    unit: string 
  } 
} = {
  'most_goals_in_game': { name: 'Most Goals in Game', icon: 'goals', color: 'green', unit: 'goals' },
  'longest_win_streak': { name: 'Longest Win Streak', icon: 'win_streak', color: 'green', unit: 'games' },
  'longest_undefeated_streak': { name: 'Longest Undefeated Streak', icon: 'undefeated_streak', color: 'green', unit: 'games' },
  'longest_losing_streak': { name: 'Longest Losing Streak', icon: 'loss_streak', color: 'red', unit: 'games' },
  'longest_winless_streak': { name: 'Longest Winless Streak', icon: 'winless_streak', color: 'red', unit: 'games' },
  'attendance_streak': { name: 'Attendance Streak', icon: 'attendance_streak', color: 'purple', unit: 'games' },
  'longest_scoring_streak': { name: 'Longest Scoring Streak', icon: 'scoring_streak', color: 'green', unit: 'games' },
};

// Helper function to get the correct ordinal suffix for numbers
const getOrdinalSuffix = (num: number): string => {
  if (num === 0) return "0th"; // Should ideally not happen for PBs
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + "st";
  if (j === 2 && k !== 12) return num + "nd";
  if (j === 3 && k !== 13) return num + "rd";
  return num + "th";
};

// Helper function to get the correct ordinal suffix for numbers
const getOrdinalSuffixHelper = (num: number): string => {
  if (num === 0) return "0th";
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + "st";
  if (j === 2 && k !== 12) return num + "nd";
  if (j === 3 && k !== 13) return num + "rd";
  return num + "th";
};

const RecordsAndAchievements: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [pbData, setPbData] = useState<PersonalBestsData | null>(null);
  const [milestonesData, setMilestonesData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const formatDateSafely = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const getPlayerByName = (name: string) => {
    return allPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
  };

  const getPlayerIdByName = (name: string): string | undefined => {
    const player = getPlayerByName(name);
    return player?.id;
  };

  const processTimelineItems = useCallback((personalBestsData: PersonalBestsData | null, milestonesData: any) => {
    const items: TimelineItem[] = [];

    // 1. Process Personal Bests
    if (personalBestsData && personalBestsData.broken_pbs_data) {
      Object.entries(personalBestsData.broken_pbs_data).forEach(([playerIdStr, playerData]) => {
        const playerId = parseInt(playerIdStr, 10);
        if (isNaN(playerId)) return;

        playerData.pbs.forEach(pb => {
          const metricDetail = PB_METRIC_DETAILS[pb.metric_type];
          if (metricDetail) {
            let content = `${metricDetail.name} - ${pb.value} ${metricDetail.unit}`;

            items.push({
              type: 'personal_best_broken',
              player: playerData.name,
              playerId: playerId,
              content: content,
              icon: metricDetail.icon,
              color: metricDetail.color,
            });
          }
        });
      });
    }

    // 2. Process Milestones (moved from left component)
    if (milestonesData) {
      // Game milestones
      if (milestonesData.gamesMilestones && milestonesData.gamesMilestones.length > 0) {
        milestonesData.gamesMilestones.forEach((milestone: Milestone) => {
          const gameCount = milestone.total_games || milestone.value || 0;
          const playerId = getPlayerIdByName(milestone.name);
          items.push({
            type: 'game_milestone',
            player: milestone.name,
            playerId: playerId || 0,
            content: `Played ${getOrdinalSuffixHelper(gameCount)} game`,
            icon: 'trophy',
            color: 'blue'
          });
        });
      }

      // Goal milestones
      if (milestonesData.goalsMilestones && milestonesData.goalsMilestones.length > 0) {
        milestonesData.goalsMilestones.forEach((milestone: Milestone) => {
          const goalCount = milestone.total_goals || milestone.value || 0;
          const playerId = getPlayerIdByName(milestone.name);
          items.push({
            type: 'goal_milestone',
            player: milestone.name,
            playerId: playerId || 0,
            content: `Scored ${getOrdinalSuffixHelper(goalCount)} goal`,
            icon: 'goal',
            color: 'blue'
          });
        });
      }

      // 3. Process Feat-Breaking Data
      if (milestonesData.featBreakingData && Array.isArray(milestonesData.featBreakingData)) {
        milestonesData.featBreakingData.forEach((feat: FeatBreakingItem) => {
          const content = generateFeatContent(feat);
          items.push({
            type: feat.status === 'broken' ? 'feat_broken' : 'feat_equaled',
            player: feat.player_name,
            playerId: feat.player_id || 0,
            content: content,
            subtext: `Previous record: ${feat.current_record}`,
            icon: 'goals', // Default icon, could be mapped based on feat_type
            color: feat.status === 'broken' ? 'red' : 'amber',
          });
        });
      }
    }

    // Sort by priority: feats first, then personal bests, then milestones, then by player name
    items.sort((a, b) => {
      // Priority order
      const typeOrder = {
        'feat_broken': 1,
        'feat_equaled': 2,
        'personal_best_broken': 3,
        'game_milestone': 4,
        'goal_milestone': 5
      };
      
      const aPriority = typeOrder[a.type] || 99;
      const bPriority = typeOrder[b.type] || 99;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Within same type, sort by player name
      if (a.player < b.player) return -1;
      if (a.player > b.player) return 1;
      return 0;
    });

    setTimelineItems(items);
  }, [allPlayers]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch personal bests, match report data, and players in parallel
        const [pbResponse, matchResponse, playersResponse] = await Promise.all([
          fetch('/api/personal-bests'),
          fetch('/api/matchReport'),
          fetch('/api/players')
        ]);
        
        // Handle personal bests
        if (pbResponse.ok) {
          const pbResult = await pbResponse.json();
          if (pbResult.success) {
            setPbData(pbResult.data as PersonalBestsData | null);
          }
        }
        
        // Handle milestones and feat-breaking data from match report
        if (matchResponse.ok) {
          const matchResult = await matchResponse.json();
          if (matchResult.success) {
            setMilestonesData(matchResult.data);
          }
        }

        // Handle players data
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setAllPlayers(playersData.data || []);
        }
        
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch data'));
        setPbData(null);
        setMilestonesData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    processTimelineItems(pbData, milestonesData);
  }, [pbData, milestonesData, processTimelineItems]);

  if (loading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border dark:bg-gray-800">
        <div className="p-4">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading Records & Achievements...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border dark:bg-gray-800">
        <div className="p-4">
          <div className="text-center text-red-500">
            <p>Error loading Records & Achievements</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pbData || timelineItems.length === 0) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border dark:bg-gray-800">
         <div className="border-black/12.5 dark:border-white/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0 dark:text-white">Records & Achievements</h5>
        </div>
        <div className="p-4">
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No recent achievements or records.</p>
            {/* Top-level match date removed, but keeping this structure in case it's re-added for context elsewhere */}
            {/* {pbData?.match_date && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Match Date: {formatDateSafely(pbData.match_date)}</p>} */}
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
      className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border dark:bg-gray-800"
    >
             <div className="border-black/12.5 dark:border-white/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0 dark:text-white">Records & Achievements</h5>
        {/* {pbData?.match_date && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Latest Match: {formatDateSafely(pbData.match_date)}</p>} */}
      </div>
      <div className="flex-auto p-4">
        <div className="overflow-x-auto px-0 pt-0 pb-2 ps"> {/* `ps` class might be specific, check if needed or adjust */}
          <div className="w-auto relative before:absolute before:left-4 before:top-0 before:h-full before:border-r-2 before:border-solid before:border-slate-100 dark:before:border-slate-700 before:content-[''] lg:before:-ml-px">
            {timelineItems.map((item, index) => (
              <motion.div 
                key={`pb-timeline-${index}`} 
                custom={index}
                variants={cardVariants}
                className="relative mb-4 last:mb-0"
              >
                <span className={`w-8 h-8 rounded-full text-base z-1 absolute left-4 inline-flex -translate-x-1/2 items-center justify-center bg-white dark:bg-gray-700 text-center font-semibold`}>
                  {/* SVG Icons based on item.icon */}
                  {item.icon === 'goals' && (
                    <svg className={`w-5 h-5 ${item.color === 'green' ? 'text-green-500' : item.color === 'red' ? 'text-red-500' : item.color === 'purple' ? 'text-purple-500' : item.color === 'amber' ? 'text-amber-500' : 'text-blue-500'} dark:text-${item.color}-400`} viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 4.75C8.007 4.75 4.75 8.007 4.75 12S8.007 19.25 12 19.25 19.25 15.993 19.25 12 15.993 4.75 12 4.75zM12 6a6 6 0 100 12 6 6 0 000-12z" />
                    </svg>
                  )}
                  {item.icon === 'trophy' && (
                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                  {item.icon === 'goal' && (
                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 4.75C8.007 4.75 4.75 8.007 4.75 12S8.007 19.25 12 19.25 19.25 15.993 19.25 12 15.993 4.75 12 4.75zM12 6a6 6 0 100 12 6 6 0 000-12z" />
                    </svg>
                  )}
                  {(item.icon === 'win_streak' || item.icon === 'scoring_streak') && ( // Fire icon from Milestones
                     <svg className={`w-5 h-5 ${item.color === 'green' ? 'text-green-500' : 'text-green-500'} dark:text-green-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  )}
                  {item.icon === 'undefeated_streak' && ( // Shield icon from Milestones (adapted, keeping color logic)
                    <svg className={`w-5 h-5 ${item.color === 'green' ? 'text-green-500' : 'text-green-500'} dark:text-green-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  )}
                  {(item.icon === 'loss_streak' || item.icon === 'winless_streak') && ( // Chart / Trend Down icon from Milestones
                    <svg className={`w-5 h-5 ${item.color === 'red' ? 'text-red-500' : 'text-red-500'} dark:text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  )}
                  {item.icon === 'attendance_streak' && ( // User / Person icon (similar to 'goal' in Milestones)
                    <svg className={`w-5 h-5 ${item.color === 'purple' ? 'text-purple-500' : 'text-blue-500'} dark:text-purple-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </span>

                <div className="ml-12 pt-1.4 max-w-120 relative -top-1.5 w-auto"> {/* max-w-120 might be specific, adjust if needed */}
                  <h6 className="mb-0 font-semibold leading-normal text-sm text-slate-700 dark:text-slate-200">
                    {/* Apply Link to item.player, preserving original h6 classes */}
                    {item.playerId && !getPlayerByName(item.player)?.isRinger ? (
                      <Link href={`/player/profiles/${item.playerId}`} className="hover:underline">
                        {item.player}
                      </Link>
                    ) : (
                      item.player
                    )}
                  </h6>
                  {/* <p className="mt-1 mb-0 font-semibold leading-tight text-xs text-slate-400 dark:text-slate-500">{item.date}</p> */}
                  <p className="mt-1 mb-2 leading-normal text-sm text-slate-700 dark:text-slate-400">{item.content}</p> {/* Adjusted margin top to mt-1 as date is removed */}
                  {/* {item.subtext && (
                    <p className="mb-2 leading-normal text-xs text-slate-500 dark:text-slate-400">{item.subtext}</p>
                  )} */}
                  
                  {/* Badge for achievement type */}
                  <span className={`py-1.5 px-3 text-xxs rounded-lg inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white 
                    ${item.type === 'feat_broken' ? 'bg-gradient-to-tl from-red-600 to-rose-400' :
                      item.type === 'feat_equaled' ? 'bg-gradient-to-tl from-amber-600 to-orange-500' :
                      item.type === 'personal_best_broken' ? (
                        item.color === 'green' ? 'bg-gradient-to-tl from-green-600 to-lime-400' : 
                        item.color === 'red' ? 'bg-gradient-to-tl from-red-600 to-rose-400' : 
                        item.color === 'purple' ? 'bg-gradient-to-tl from-purple-600 to-violet-400' :
                        'bg-gradient-to-tl from-gray-600 to-slate-400'
                      ) :
                      'bg-gradient-to-tl from-blue-600 to-cyan-400'}`}>
                    {item.type === 'feat_broken' ? 'RECORD BROKEN' :
                     item.type === 'feat_equaled' ? 'RECORD EQUALED' :
                     item.type === 'personal_best_broken' ? 'PERSONAL BEST' :
                     'MILESTONE'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RecordsAndAchievements; 