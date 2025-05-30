'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NavPills from '@/components/ui-kit/NavPills.component';
import FireIcon from '@/components/icons/FireIcon.component';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon.component';

interface PlayerStats {
  name: string;
  player_id: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  heavy_wins: number;
  heavy_losses: number;
  clean_sheets: number;
  win_percentage: number;
  fantasy_points: number;
  points_per_game: number;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

interface GoalStats {
  name: string;
  player_id: number;
  total_goals: number;
  minutes_per_goal: number;
  last_five_games: string;
  max_goals_in_game: number;
  selected_club?: {
    name: string;
    filename: string;
  } | null;
}

interface FormData {
  name: string;
  last_5_games?: string;
}

interface StatsData {
  seasonStats: PlayerStats[];
  goalStats: GoalStats[];
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
  const yearOptions: number[] = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];
  const isMounted = useRef(true); // Track component mount state
  // Client-side only rendering for hydration safety
  const [isClient, setIsClient] = useState(false);

  // NEW: State for special player IDs and config
  const [onFirePlayerId, setOnFirePlayerId] = useState<number | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<number | null>(null);
  const [showOnFireConfig, setShowOnFireConfig] = useState<boolean>(true);
  const [showGrimReaperConfig, setShowGrimReaperConfig] = useState<boolean>(true);

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
        
        if (result.data && result.data.seasonStats && result.data.seasonStats.length > 0) {
          // Only update state if component is still mounted
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

  const renderPlayerName = (playerId: number, name: string) => {
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
          <h5 className="mb-0">{title}</h5>
        </div>
        {/* Container for horizontal scrolling only */}
        <div className="overflow-x-auto">
          <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
            <thead className="align-bottom">
              <tr>
                {/* Sticky Headers */}
                <th className="sticky left-0 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-8 text-center">#</th>
                <th className="sticky left-8 z-40 px-1 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 w-10"></th> {/* Icon Placeholder */}
                <th className="sticky left-18 z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[120px]">Player</th>
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
                 const losses = player.games_played - player.wins - player.draws; // Calculate losses if needed
                 return (
                  <tr key={index} className="hover:bg-gray-50">
                    {/* Sticky Data */}
                    <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap text-center w-8">
                       <span className="font-normal leading-normal text-sm">{index + 1}</span>
                    </td>
                    <td className="sticky left-8 z-20 p-2 align-middle bg-white border-b whitespace-nowrap w-10">
                      {/* Placeholder Icon */}
                      {player.selected_club ? (
                        <img
                          src={`/club-logos-40px/${player.selected_club.filename}`}
                          alt={player.selected_club.name}
                          className="w-8 h-8"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                    </td>
                     <td className="sticky left-18 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[120px]">
                      <div className="flex px-2 py-1">
                        <div className="flex flex-col justify-center">
                          <h6 className="mb-0 leading-normal text-sm">
                            {renderPlayerName(player.player_id, player.name)} 
                          </h6>
                        </div>
                      </div>
                    </td>
                    {/* Scrollable Data */}
                    {statsType === 'points' ? (
                      <>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <p className="mb-0 font-semibold leading-normal text-sm">{player.fantasy_points}</p>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">{player.games_played}</span>
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
                           <span className="font-normal leading-normal text-sm">{player.heavy_wins}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.heavy_losses}</span>
                         </td>
                         <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className="font-normal leading-normal text-sm">{player.clean_sheets}</span>
                         </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-normal leading-normal text-sm">{Math.round(player.win_percentage)}%</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                          <span className="font-semibold leading-normal text-sm">{player.total_goals}</span>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                           <span className={`leading-normal text-sm ${player.total_goals > 0 && player.minutes_per_goal <= 90 ? 'text-green-500 font-semibold' : ''}`}>
                            {player.minutes_per_goal}
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
            {activeTab === 'stats' && renderTable(stats.seasonStats, 'Points Leaderboard', 'points')}
            {activeTab === 'goals' && renderTable(stats.goalStats, 'Goalscoring Leaderboard', 'goals')}
          </div>
        </>
      )}
    </div>
  );
};

export default OverallSeasonPerformance; 