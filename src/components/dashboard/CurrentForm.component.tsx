'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { PlayerProfile } from '@/types/player.types';
import { useMatchReport } from '@/hooks/queries/useMatchReport.hook';
import { usePlayers } from '@/hooks/queries/usePlayers.hook';
import { useAppConfig } from '@/hooks/queries/useAppConfig.hook';

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

interface TimelineItem {
  type: 'form_streak' | 'goal_streak';
  player: string;
  playerId?: string;
  content: string;
  subtext?: string;
  icon: 'fire' | 'chart' | 'soccer';
  date?: string;
  color?: string;
}

const CurrentForm: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);

  // React Query hooks - automatic caching and deduplication!
  const { data: milestonesData, isLoading: milestonesLoading, error: milestonesError } = useMatchReport();
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers();
  const { data: configData = [], isLoading: configLoading } = useAppConfig('match_settings');

  // Extract config values
  const showOnFireConfig = useMemo(() => {
    const config = configData.find(c => c.config_key === 'show_on_fire');
    return config?.config_value !== 'false';
  }, [configData]);

  const showGrimReaperConfig = useMemo(() => {
    const config = configData.find(c => c.config_key === 'show_grim_reaper');
    return config?.config_value !== 'false';
  }, [configData]);

  // Combined loading/error states
  const loading = milestonesLoading || playersLoading || configLoading;
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

  // Don't use useCallback - inline function to avoid dependency issues
  const getPlayerIdByName = (name: string): string | undefined => {
    const player = allPlayers.find(p => p.name === name);
    return player?.id;
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
    
    // Get all players who played in this match
    const allMatchPlayers = [
      ...(data.matchInfo?.team_a_players || []),
      ...(data.matchInfo?.team_b_players || [])
    ];
    
    // Add form streaks - ONLY for players who played in this match
    if (data.streaks && data.streaks.length > 0) {
      data.streaks.forEach(streak => {
        if (!allMatchPlayers.includes(streak.name)) {
          return;
        }
        
        const streakType = 
          streak.streak_type === 'win' ? 'winning' :
          streak.streak_type === 'loss' ? 'losing' :
          streak.streak_type === 'unbeaten' ? 'unbeaten' : 'winless';
        
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
    
    // Add goal streaks - ONLY for players who played in this match
    if (data.goalStreaks && data.goalStreaks.length > 0) {
      data.goalStreaks.forEach(streak => {
        if (!allMatchPlayers.includes(streak.name)) {
          return;
        }
        
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
    
    setTimelineItems(items);
  };

  useEffect(() => {
    if (milestonesData && !playersLoading) {
      processTimelineItems(milestonesData);
    }
  }, [milestonesData, allPlayers.length, playersLoading]); // Only depend on length, not array reference

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
            <p className="text-sm">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Only show empty state if there are no timeline items AND no player status to display
  const hasPlayerStatus = (showOnFireConfig && milestonesData?.on_fire_player_id) || 
                          (showGrimReaperConfig && milestonesData?.grim_reaper_player_id);
  
  if (timelineItems.length === 0 && !hasPlayerStatus) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Current Form</h5>
        </div>
        <div className="p-4">
          <div className="text-center">
            <p className="text-sm text-slate-500">No current form data to display</p>
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
         <h5 className="mb-0">Current Form</h5>
       </div>
      <div className="flex-auto p-4">
        {/* Reaper and On Fire Status */}
        {((showGrimReaperConfig && milestonesData?.grim_reaper_player_id) || (showOnFireConfig && milestonesData?.on_fire_player_id)) && (
          <div className="mb-6">
            <div className="flex justify-center gap-8">
              {showGrimReaperConfig && milestonesData?.grim_reaper_player_id && (
                <div className="text-center">
                  <img 
                    src="/img/player-status/reaper.png" 
                    alt="The Grim Reaper" 
                    className="w-24 h-24 mx-auto mb-2 rounded-lg shadow-soft-md"
                  />
                  <p className="text-sm text-slate-700">
                    {allPlayers.find(p => p.id === milestonesData.grim_reaper_player_id) ? (
                      <Link 
                        href={`/player/profiles/${milestonesData.grim_reaper_player_id}`} 
                        className="hover:underline"
                      >
                        {allPlayers.find(p => p.id === milestonesData.grim_reaper_player_id)?.name}
                      </Link>
                    ) : (
                      'Unknown Player'
                    )}
                  </p>
                </div>
              )}
              {showOnFireConfig && milestonesData?.on_fire_player_id && (
                <div className="text-center">
                  <img 
                    src="/img/player-status/on-fire.png" 
                    alt="On Fire" 
                    className="w-24 h-24 mx-auto mb-2 rounded-lg shadow-soft-md"
                  />
                  <p className="text-sm text-slate-700">
                    {allPlayers.find(p => p.id === milestonesData.on_fire_player_id) ? (
                      <Link 
                        href={`/player/profiles/${milestonesData.on_fire_player_id}`} 
                        className="hover:underline"
                      >
                        {allPlayers.find(p => p.id === milestonesData.on_fire_player_id)?.name}
                      </Link>
                    ) : (
                      'Unknown Player'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Only show timeline section if there are timeline items */}
        {timelineItems.length > 0 && (
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
                </span>

                <div className="ml-12 pt-1.4 max-w-120 relative -top-1.5 w-auto">
                  <h6 className="mb-0 font-semibold leading-normal text-sm text-slate-700">
                    {item.playerId ? (
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
                  
                  {/* Colored badges */}
                  {item.type === 'form_streak' && item.color === 'green' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-green-600 to-lime-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Streak</span>
                  )}
                  {item.type === 'form_streak' && item.color === 'red' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-red-600 to-rose-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Streak</span>
                  )}
                  {item.type === 'goal_streak' && (
                    <span className="py-1.5 px-3 text-xxs rounded-lg bg-gradient-to-tl from-green-600 to-lime-400 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">Scoring Streak</span>
                  )}
                </div>
              </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CurrentForm;
