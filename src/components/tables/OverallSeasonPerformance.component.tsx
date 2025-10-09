'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import FireIcon from '@/components/icons/FireIcon.component';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon.component';
import FantasyPointsTooltip from '@/components/ui-kit/FantasyPointsTooltip.component';
import { getSeasonTitles } from '@/utils/seasonTitles.util';
import { PlayerWithStats, PlayerWithGoalStats } from '@/types/player.types';
import { useCurrentStats } from '@/hooks/queries/useCurrentStats.hook';
import { useSeasons } from '@/hooks/queries/useSeasons.hook';
import { useMatchReport } from '@/hooks/queries/useMatchReport.hook';
import { useAppConfig } from '@/hooks/queries/useAppConfig.hook';

interface OverallSeasonPerformanceProps {
  initialView?: 'points' | 'goals';
}

const OverallSeasonPerformance: React.FC<OverallSeasonPerformanceProps> = ({ initialView = 'points' }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'goals'>(initialView === 'goals' ? 'goals' : 'stats');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [isClient, setIsClient] = useState(false);
  const yearOptions: number[] = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];

  // Fantasy Points Tooltip state
  const [isFantasyPointsTooltipOpen, setIsFantasyPointsTooltipOpen] = useState<boolean>(false);

  // React Query hooks - automatic caching and deduplication!
  const { data: statsData, isLoading: statsLoading, error: statsError } = useCurrentStats(selectedYear);
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();
  const { data: matchData, isLoading: matchLoading } = useMatchReport();
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

  // Extract player IDs from match data
  const onFirePlayerId = matchData?.on_fire_player_id || null;
  const grimReaperPlayerId = matchData?.grim_reaper_player_id || null;

  // Find selected season
  const selectedSeason = useMemo(() => {
    if (seasons.length === 0) return null;
    const season = seasons.find((s: any) => {
      const year = new Date(s.startDate).getFullYear();
      return year === selectedYear;
    });
    return season || null;
  }, [selectedYear, seasons]);

  // Combined loading state - ONLY check initial load, not background refetch
  // This allows stale-while-revalidate: show cached data while refetching in background
  const loading = statsLoading || seasonsLoading || matchLoading || configLoading;

  // Extract stats with defaults
  const seasonStats = statsData?.seasonStats || [];
  const goalStats = statsData?.goalStats || [];
  
  // DEBUG: Log when we have empty stats but not loading
  if (!loading && seasonStats.length === 0 && statsData !== undefined) {
    console.warn('🐛 [WHOLE-SEASON] Empty stats but not loading!', {
      statsLoading,
      hasStatsData: !!statsData,
      seasonStatsLength: statsData?.seasonStats?.length,
      selectedYear
    });
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update activeTab when initialView changes
  useEffect(() => {
    setActiveTab(initialView === 'goals' ? 'goals' : 'stats');
  }, [initialView]);

  const renderPlayerName = (playerId: string, name: string) => {
    const currentYear = new Date().getFullYear();
    const isCurrentYear = selectedYear === currentYear;

    return (
      <Link href={`/player/profiles/${playerId}`} className="hover:underline">
        <div className="flex items-center">
          <span>{name}</span>
          {isCurrentYear && showOnFireConfig && playerId === onFirePlayerId && (
            <FireIcon className="w-4 h-4 ml-1 text-green-500" />
          )}
          {isCurrentYear && showGrimReaperConfig && playerId === grimReaperPlayerId && (
            <GrimReaperIcon className="w-6 h-6 ml-1 text-black" />
          )}
        </div>
      </Link>
    );
  };

  const renderTable = (data: any[], title: string, statsType: 'points' | 'goals') => {
    if (!data || data.length === 0) {
      return <p>No data available for {title}.</p>;
    }

    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6 lg:w-fit">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <div className="flex items-center">
            <h5 className="mb-0">{title}</h5>
            {statsType === 'points' && (
              <button
                onClick={() => setIsFantasyPointsTooltipOpen(true)}
                className="ml-2 w-5 h-5 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center text-slate-600 hover:text-slate-700 transition-all shadow-soft-md hover:shadow-soft-lg hover:scale-102 focus:outline-none"
                aria-label="Scoring System Info"
                title="Click to see how points are calculated"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
            <thead className="align-bottom">
              <tr>
                <th className="sticky left-0 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-8 text-center">#</th>
                <th className="sticky left-8 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th>
                <th className="sticky left-[4.5rem] z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[120px]">Player</th>
                {statsType === 'points' ? (
                  <>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">Points</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">P</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">W</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">D</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">L</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">G</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">HW</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">HL</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">CS</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">Win %</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">Goals</th>
                    <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">MPG</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((player: any, index: number) => {
                 const losses = player.gamesPlayed - player.wins - player.draws;
                 return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap text-center w-8">
                       <span className="font-normal leading-normal text-sm">{index + 1}</span>
                    </td>
                    <td className="sticky left-8 z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                      {player.club ? (
                        <img
                          src={`/club-logos-40px/${player.club.filename}`}
                          alt={player.club.name}
                          className="w-8 h-8"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                    </td>
                     <td className="sticky left-[4.5rem] z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                      <div className="flex px-2 py-1">
                        <div className="flex flex-col justify-center">
                          <h6 className="mb-0 leading-normal text-sm">
                            {renderPlayerName(player.id, player.name)} 
                          </h6>
                        </div>
                      </div>
                    </td>
                    {statsType === 'points' ? (
                      <>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <p className="mb-0 font-semibold leading-normal text-sm">{player.fantasyPoints}</p>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">{player.gamesPlayed}</span>
                        </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.wins}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.draws}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{losses}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.goals}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.heavyWins}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.heavyLosses}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.cleanSheets}</span>
                         </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">{Math.round(player.winPercentage)}%</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-semibold leading-normal text-sm">{player.totalGoals}</span>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className={`leading-normal text-sm ${player.totalGoals > 0 && player.minutesPerGoal <= 90 ? 'text-green-500 font-semibold' : ''}`}>
                            {player.minutesPerGoal}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update activeTab when initialView changes
  useEffect(() => {
    setActiveTab(initialView === 'goals' ? 'goals' : 'stats');
  }, [initialView]);

  if (statsError) {
    return (
      <div className="flex flex-wrap justify-start -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center text-red-500">
              <p>Error loading stats</p>
              <p className="text-sm">{(statsError as Error).message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((loading && seasonStats.length === 0) || !isClient) {
    return (
      <div className="flex flex-wrap justify-start -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="flex items-center justify-center p-5">
              <div className="text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <h6 className="mt-3 mb-0 text-lg">Loading season statistics...</h6>
                <p className="text-sm text-slate-400">Please wait while we fetch the data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-start -mx-3">
      {/* Year Selector */}
      <div className="w-full max-w-full px-3 mb-4">
        <div className="flex justify-end">
          <div className="w-40 relative">
            {isClient && (
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="block w-full bg-white border border-gray-200 text-sm shadow-soft-md rounded-lg font-medium py-2 px-3 text-gray-700 appearance-none focus:outline-none"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {seasonStats.length === 0 ? (
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="flex items-center justify-center p-5">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 text-slate-400 bg-slate-100 rounded-xl mb-4">
                  <i className="fa fa-search text-3xl"></i>
                </div>
                <h6 className="mb-1 text-lg">No data available</h6>
                <p className="mb-0 text-sm text-slate-400">No statistics available for {selectedYear}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full px-3">
          {activeTab === 'stats' && renderTable(seasonStats, `Points (${selectedSeason ? getSeasonTitles(selectedSeason.startDate, selectedSeason.halfDate, selectedSeason.endDate).wholeSeasonTitle : selectedYear})`, 'points')}
          {activeTab === 'goals' && renderTable(goalStats, `Goals (${selectedSeason ? getSeasonTitles(selectedSeason.startDate, selectedSeason.halfDate, selectedSeason.endDate).wholeSeasonTitle : selectedYear})`, 'goals')}
        </div>
      )}
      
      <FantasyPointsTooltip
        isOpen={isFantasyPointsTooltipOpen}
        onClose={() => setIsFantasyPointsTooltipOpen(false)}
      />
    </div>
  );
};

export default OverallSeasonPerformance;
