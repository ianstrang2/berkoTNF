'use client';
import React, { useState, useEffect, useRef } from 'react';
import NavPills from '@/components/ui-kit/NavPills.component';
import FireIcon from '@/components/icons/FireIcon';
import GrimReaperIcon from '@/components/icons/GrimReaperIcon';

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

interface HalfSeasonPeriod {
  year: number;
  half: number;
  startDate: string;
  endDate: string;
  description: string;
}

const CurrentHalfSeason: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'goals'>('stats');
  const [stats, setStats] = useState<StatsData>({
    seasonStats: [],
    goalStats: [],
    formData: []
  });
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // NEW: State for special player IDs and config
  const [onFirePlayerId, setOnFirePlayerId] = useState<number | null>(null);
  const [grimReaperPlayerId, setGrimReaperPlayerId] = useState<number | null>(null);
  const [showOnFireConfig, setShowOnFireConfig] = useState<boolean>(true);
  const [showGrimReaperConfig, setShowGrimReaperConfig] = useState<boolean>(true);

  // Track component mount state
  const isMounted = useRef(true);
  
  // Set up isMounted ref cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getCurrentHalf = (): HalfSeasonPeriod => {
    // Server-safe implementation that doesn't depend on the browser's time
    // This helps avoid hydration mismatches
    const serverDate = new Date();
    const year = serverDate.getFullYear();
    const month = serverDate.getMonth();
    const isFirstHalf = month < 6;

    return {
      year,
      half: isFirstHalf ? 1 : 2,
      startDate: isFirstHalf ? `${year}-01-01` : `${year}-07-01`,
      endDate: isFirstHalf ? `${year}-06-30` : `${year}-12-31`,
      description: `${isFirstHalf ? 'First' : 'Second'} Half ${year}`
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [statsResponse, reportResponse, configResponse] = await Promise.all([
        fetch('/api/stats/half-season', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/matchReport'),
        fetch('/api/admin/app-config?group=match_settings')
      ]);

      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      // Ensure we have valid data structure even if the API returns unexpected format
      setStats({
        seasonStats: statsData?.data?.seasonStats || [],
        goalStats: statsData?.data?.goalStats || [],
        formData: statsData?.data?.formData || []
      });

      // Get On Fire and Grim Reaper IDs from match report
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        setOnFirePlayerId(reportData.data?.on_fire_player_id || null);
        setGrimReaperPlayerId(reportData.data?.grim_reaper_player_id || null);
      }

      // Get config for visibility
      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.success) {
          const showOnFire = configData.data.find((config: any) => config.config_key === 'show_on_fire');
          const showGrimReaper = configData.data.find((config: any) => config.config_key === 'show_grim_reaper');
          setShowOnFireConfig(showOnFire?.config_value !== 'false');
          setShowGrimReaperConfig(showGrimReaper?.config_value !== 'false');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load stats');
      // Ensure we have valid empty state on error
      setStats({
        seasonStats: [],
        goalStats: [],
        formData: []
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderPlayerName = (playerId: number, name: string) => (
    <div className="flex items-center">
      <span>{name}</span>
      {showOnFireConfig && playerId === onFirePlayerId && (
        <FireIcon className="w-4 h-4 ml-1 text-green-500" />
      )}
      {showGrimReaperConfig && playerId === grimReaperPlayerId && (
        <GrimReaperIcon className="w-6 h-6 ml-1 text-black" />
      )}
    </div>
  );

  const renderMainStats = () => (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">Points Leaderboard</h5>
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
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.seasonStats.map((player, index) => {
              const form = stats.formData.find(f => f.name === player.name)?.last_5_games?.split(', ') || [];
              const losses = player.games_played - player.wins - player.draws;
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
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <div className="flex justify-center gap-2">
                      {form.map((result, i) => (
                        <span 
                          key={i} 
                          className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white rounded-full ${
                            result.includes('W') 
                              ? 'bg-green-500' 
                              : result === 'D' 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`}
                        >
                          {result.replace('H', '')}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGoalStats = () => (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">Goalscoring Leaderboard</h5>
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
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">Goals</th>
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">MPG</th>
              <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">Last 5</th>
            </tr>
          </thead>
          <tbody>
            {stats.goalStats
              .filter(player => player.total_goals > 0)
              .map((player, index) => (
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
                <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                  <span className="font-semibold leading-normal text-sm">{player.total_goals}</span>
                </td>
                <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                  <span className={`leading-normal text-sm ${player.total_goals > 0 && player.minutes_per_goal <= 90 ? 'text-green-500 font-semibold' : ''}`}>
                    {player.minutes_per_goal}
                  </span>
                </td>
                <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                  <div className="flex justify-center gap-2">
                    {player.last_five_games?.split(',').map((goals, i) => {
                      const goalCount = parseInt(goals);
                      return (
                        <span 
                          key={i} 
                          className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                            goalCount > 0 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {goalCount}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap justify-start -mx-3">
      {loading ? (
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center">
              <h6 className="mb-2 text-lg">Loading half-season stats...</h6>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {stats.seasonStats.length === 0 ? (
            <div className="w-full max-w-full px-3 flex-none">
              <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
                <div className="text-center py-4">
                  <h5 className="mb-2">No Data Available</h5>
                  <p className="text-sm text-gray-600">Statistics for this half-season period are not yet available.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Nav Pills - Only visible on mobile */}
              <div className="w-full px-3 mb-4 lg:hidden">
                <NavPills<'stats' | 'goals'>
                  items={[
                    { label: 'Points', value: 'stats' },
                    { label: 'Goals', value: 'goals' }
                  ]}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>

              {/* Desktop Layout - Hidden on mobile */}
              <div className="hidden lg:block">
                {/* Points Leaderboard */}
                <div className="inline-block align-top px-3 mb-6">
                  {renderMainStats()}
                </div>
                
                {/* Goalscoring Leaderboard */}
                <div className="inline-block align-top px-3 mb-6">
                  {renderGoalStats()}
                </div>
              </div>

              {/* Mobile Layout - Hidden on desktop */}
              <div className="block lg:hidden w-full px-3">
                {activeTab === 'stats' && renderMainStats()}
                {activeTab === 'goals' && renderGoalStats()}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CurrentHalfSeason; 