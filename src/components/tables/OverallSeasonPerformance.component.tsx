'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NavPills from '@/components/ui-kit/NavPills.component';
import FireIcon from '@/components/icons/FireIcon.component';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon.component';
import FantasyPointsTooltip from '@/components/ui-kit/FantasyPointsTooltip.component';
import { getSeasonTitles } from '@/utils/seasonTitles.util';
import { PlayerWithStats, PlayerWithGoalStats, Club } from '@/types/player.types';

interface FormData {
  name: string;
  last_5_games?: string;
}

interface StatsData {
  seasonStats: PlayerWithStats[];
  goalStats: PlayerWithGoalStats[];
  formData: FormData[];
}

interface OverallSeasonPerformanceProps {
  initialView?: 'points' | 'goals';
}

const OverallSeasonPerformance: React.FC<OverallSeasonPerformanceProps> = ({ initialView = 'points' }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'goals'>(initialView === 'goals' ? 'goals' : 'stats');
  const [stats, setStats] = useState<StatsData>({
    seasonStats: [],
    goalStats: [],
    formData: []
  });
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<any | null>(null);
  const yearOptions: number[] = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];
  const isMounted = useRef(true); // Track component mount state
  // Client-side only rendering for hydration safety
  const [isClient, setIsClient] = useState(false);

  // NEW: State for special player IDs and config
  const [onFirePlayerId, setOnFirePlayerId] = useState<string | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<string | null>(null);
  const [showOnFireConfig, setShowOnFireConfig] = useState<boolean>(true);
  const [showGrimReaperConfig, setShowGrimReaperConfig] = useState<boolean>(true);

  // Fantasy Points Tooltip state
  const [isFantasyPointsTooltipOpen, setIsFantasyPointsTooltipOpen] = useState<boolean>(false);

  // Fetch seasons data
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch('/api/seasons');
        const data = await response.json();
        if (data.success && data.data) {
          setSeasons(data.data);
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      }
    };
    
    fetchSeasons();
  }, []);

  // Update selected season when year or seasons change
  useEffect(() => {
    if (seasons.length > 0) {
      const season = seasons.find(s => {
        const year = new Date(s.startDate).getFullYear();
        return year === selectedYear;
      });
      setSelectedSeason(season || null);
    }
  }, [selectedYear, seasons]);

  useEffect(() => {
    // Set isMounted ref to true when component mounts
    isMounted.current = true;
    setIsClient(true);
    // Clean up function that runs when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false; // For preventing race conditions
    
    const fetchData = async () => {
      try {
        // Early return if component is unmounting
        if (!isMounted.current) return;
        
        setLoading(true);
        
        // Fetch all data in parallel
        const [statsResponse, reportResponse, configResponse] = await Promise.all([
          fetch('/api/stats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              startDate: `${selectedYear}-01-01`,
              endDate: `${selectedYear}-12-31`
            })
          }),
          fetch('/api/matchReport'),
          fetch('/api/admin/app-config?group=match_settings')
        ]);
        
        // Early return if component is unmounting or request was cancelled
        if (!isMounted.current || isCancelled) return;
        
        const result = await statsResponse.json();
        console.log('API Response:', result);
        
        if (result.data) {
          // No longer need to transform API data. The API now returns canonical types.
          if (isMounted.current && !isCancelled) {
            setStats({
              seasonStats: result.data.seasonStats || [],
              goalStats: result.data.goalStats || [],
              formData: result.data.formData || []
            });
          }
        } else {
          console.log('No data received from API');
          if (isMounted.current && !isCancelled) {
            setStats({
              seasonStats: [],
              goalStats: [],
              formData: []
            });
          }
        }

        // Get On Fire and Grim Reaper IDs from match report
        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          if (isMounted.current && !isCancelled) {
            setOnFirePlayerId(reportData.data?.on_fire_player_id || null);
            setGrimReaperPlayerId(reportData.data?.grim_reaper_player_id || null);
          }
        }

        // Get config for visibility
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.success && isMounted.current && !isCancelled) {
            const showOnFire = configData.data.find((config: any) => config.config_key === 'show_on_fire');
            const showGrimReaper = configData.data.find((config: any) => config.config_key === 'show_grim_reaper');
            setShowOnFireConfig(showOnFire?.config_value !== 'false');
            setShowGrimReaperConfig(showGrimReaper?.config_value !== 'false');
          }
        }
        
        if (isMounted.current && !isCancelled) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        if (isMounted.current && !isCancelled) {
          setLoading(false);
          setStats({
            seasonStats: [],
            goalStats: [],
            formData: []
          });
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [selectedYear]);

  // Update activeTab when initialView changes
  useEffect(() => {
    setActiveTab(initialView === 'goals' ? 'goals' : 'stats');
  }, [initialView]);

  const renderPlayerName = (playerId: string, name: string) => {
    const currentYear = new Date().getFullYear();
    const isCurrentYear = selectedYear === currentYear;

    return (
      <Link href={`/players/${playerId}`} className="hover:underline">
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
        {/* Container for horizontal scrolling only */}
        <div className="overflow-x-auto">
          <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
            <thead className="align-bottom">
              <tr>
                {/* Sticky Headers */}
                <th className="sticky left-0 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-8 text-center">#</th>
                <th className="sticky left-8 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th> {/* Icon Placeholder */}
                <th className="sticky left-[4.5rem] z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[120px]">Player</th>
                {/* Scrollable Headers */}
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
                 const losses = player.gamesPlayed - player.wins - player.draws; // Calculate losses if needed
                 return (
                  <tr key={index} className="hover:bg-gray-50">
                    {/* Sticky Data */}
                    <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap text-center w-8">
                       <span className="font-normal leading-normal text-sm">{index + 1}</span>
                    </td>
                    <td className="sticky left-8 z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                      {/* Placeholder Icon */}
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
                    {/* Scrollable Data */}
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

  if (loading || !isClient) {
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
      
      {stats.seasonStats.length === 0 ? (
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
        <>
          {/* Single table display controlled by tertiary navigation */}
          <div className="w-full px-3">
            {activeTab === 'stats' && renderTable(stats.seasonStats, `Points (${selectedSeason ? getSeasonTitles(selectedSeason.startDate, selectedSeason.halfDate, selectedSeason.endDate).wholeSeasonTitle : selectedYear})`, 'points')}
            {activeTab === 'goals' && renderTable(stats.goalStats, `Goals (${selectedSeason ? getSeasonTitles(selectedSeason.startDate, selectedSeason.halfDate, selectedSeason.endDate).wholeSeasonTitle : selectedYear})`, 'goals')}
          </div>
        </>
      )}
      
      {/* Fantasy Points Tooltip Modal */}
      <FantasyPointsTooltip
        isOpen={isFantasyPointsTooltipOpen}
        onClose={() => setIsFantasyPointsTooltipOpen(false)}
      />
    </div>
  );
};

export default OverallSeasonPerformance; 