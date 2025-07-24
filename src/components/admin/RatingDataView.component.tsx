'use client';

import React, { useState, useEffect } from 'react';
// Temporarily removed Select import to avoid TypeScript issues

interface Player {
  player_id: number;
  name: string;
  isRinger: boolean;
}

interface PeriodData {
  start_date: string;
  end_date: string;
  power_rating: number;
  goal_threat: number;
  participation: number;
  power_rating_percentile: number;
  goal_threat_percentile: number;
  participation_percentile: number;
}

interface PlayerRatingData {
  historical_blocks: PeriodData[];
  trend_rating: number;
  trend_goal_threat: number;
  trend_participation: number;
  power_rating_percentile: number;
  goal_threat_percentile: number;
}

export const RatingDataView: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [ratingData, setRatingData] = useState<PlayerRatingData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/players');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        
        const playerArray = Array.isArray(data) ? data : 
                          data.players ? data.players : 
                          data.data ? data.data : [];
                          
        if (playerArray.length === 0) {
          console.warn('No players found in response');
        }
        
        // Include ringers in debugging view - they have power rating data too
        setPlayers(playerArray);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError(err instanceof Error ? err.message : 'Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  useEffect(() => {
    const fetchRatingData = async () => {
      if (!selectedPlayer) return;
      
      setDataLoading(true);
      setDataError(null);
      try {
        const [trendsRes, profileRes] = await Promise.all([
          fetch(`/api/player/trends/${selectedPlayer}`),
          fetch(`/api/playerprofile?id=${selectedPlayer}`)
        ]);

        if (!trendsRes.ok) throw new Error(`Trends API error: ${trendsRes.status}`);
        if (!profileRes.ok) throw new Error(`Profile API error: ${profileRes.status}`);

        const trendsData = await trendsRes.json();
        const profileData = await profileRes.json();

        const trends = trendsData.data || {};
        const profile = profileData.data || {};

        const blocks = profile.historical_blocks || [];
        if (blocks.length === 0) {
          console.warn('No historical blocks found for player');
        }

        setRatingData({
          historical_blocks: blocks,
          trend_rating: trends.trend_rating || 0,
          trend_goal_threat: trends.trend_goal_threat || 0,
          trend_participation: trends.trend_participation || 0,
          power_rating_percentile: trends.power_rating_percentile || 0,
          goal_threat_percentile: trends.goal_threat_percentile || 0
        });
      } catch (err) {
        console.error('Error fetching rating data:', err);
        setDataError(err instanceof Error ? err.message : 'Failed to load rating data');
        setRatingData(null);
      } finally {
        setDataLoading(false);
      }
    };

    fetchRatingData();
  }, [selectedPlayer]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const renderTable = (title: string, isPercentile: boolean = false) => (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6 lg:w-fit">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">{title}</h5>
      </div>
      
      {ratingData && ratingData.historical_blocks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500 relative">
            <thead className="align-bottom">
              <tr>
                {/* Sticky Header for Metric */}
                <th className="sticky left-0 z-40 px-2 py-3 font-bold uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 min-w-[100px]">
                  Metric
                </th>
                
                {/* Period Headers */}
                {ratingData.historical_blocks
                  .slice()
                  .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
                  .map((block, i) => (
                  <th 
                    key={i}
                    className="px-3 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-help relative"
                    onMouseEnter={() => setHoveredPeriod(i + (isPercentile ? 100 : 0))}
                    onMouseLeave={() => setHoveredPeriod(null)}
                  >
                    P{i + 1}
                    {hoveredPeriod === (i + (isPercentile ? 100 : 0)) && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {formatDateRange(block.start_date, block.end_date)}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                      </div>
                    )}
                  </th>
                ))}
                
                {/* Trend Header */}
                <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-blue-50 border-b border-gray-300 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-blue-600 opacity-90">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Power Rating Row */}
              <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[100px]">
                  <div className="flex px-2 py-1">
                    <h6 className="mb-0 leading-normal text-sm font-medium text-slate-700">Power Rating</h6>
                  </div>
                </td>
                {ratingData.historical_blocks
                  .slice()
                  .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
                  .map((block, i) => (
                  <td key={i} className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">
                      {isPercentile 
                        ? (block.power_rating_percentile ? block.power_rating_percentile.toFixed(0) : '-')
                        : (block.power_rating ? block.power_rating.toFixed(2) : '-')
                      }
                    </span>
                  </td>
                ))}
                <td className="p-2 text-center align-middle bg-blue-50 border-b whitespace-nowrap">
                  <span className="font-semibold leading-normal text-sm text-blue-600">
                    {isPercentile 
                      ? (ratingData.power_rating_percentile ? ratingData.power_rating_percentile.toFixed(0) : '-')
                      : (ratingData.trend_rating ? ratingData.trend_rating.toFixed(2) : '-')
                    }
                  </span>
                </td>
              </tr>
              
              {/* Goal Threat Row */}
              <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[100px]">
                  <div className="flex px-2 py-1">
                    <h6 className="mb-0 leading-normal text-sm font-medium text-slate-700">Goal Threat</h6>
                  </div>
                </td>
                {ratingData.historical_blocks
                  .slice()
                  .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
                  .map((block, i) => (
                  <td key={i} className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">
                      {isPercentile 
                        ? (block.goal_threat_percentile ? block.goal_threat_percentile.toFixed(0) : '-')
                        : (block.goal_threat ? block.goal_threat.toFixed(3) : '-')
                      }
                    </span>
                  </td>
                ))}
                <td className="p-2 text-center align-middle bg-blue-50 border-b whitespace-nowrap">
                  <span className="font-semibold leading-normal text-sm text-blue-600">
                    {isPercentile 
                      ? (ratingData.goal_threat_percentile ? ratingData.goal_threat_percentile.toFixed(0) : '-')
                      : (ratingData.trend_goal_threat ? ratingData.trend_goal_threat.toFixed(3) : '-')
                    }
                  </span>
                </td>
              </tr>
              
              {/* Attendance Row */}
              <tr className="hover:bg-gray-50">
                <td className="sticky left-0 z-20 p-2 align-middle bg-white border-b whitespace-nowrap min-w-[100px]">
                  <div className="flex px-2 py-1">
                    <h6 className="mb-0 leading-normal text-sm font-medium text-slate-700">Attendance</h6>
                  </div>
                </td>
                {ratingData.historical_blocks
                  .slice()
                  .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
                  .map((block, i) => (
                  <td key={i} className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap">
                    <span className="font-normal leading-normal text-sm">
                      {isPercentile 
                        ? (block.participation_percentile ? block.participation_percentile.toFixed(0) : '-')
                        : (block.participation ? `${block.participation}%` : '-')
                      }
                    </span>
                  </td>
                ))}
                <td className="p-2 text-center align-middle bg-blue-50 border-b whitespace-nowrap">
                  <span className="font-semibold leading-normal text-sm text-blue-600">
                    {isPercentile 
                      ? '-'
                      : (ratingData.trend_participation ? `${ratingData.trend_participation.toFixed(0)}%` : '-')
                    }
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : ratingData && ratingData.trend_rating !== undefined && ratingData.trend_rating !== null ? (
        /* Special display for ringers - current trend values only */
        <div className="p-5">
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h6 className="mb-2 text-sm font-semibold text-amber-800">Ringer - Current Trend Values Only</h6>
            <p className="text-xs text-amber-700">No historical data available, but current trend values are calculated for team balancing.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Power Rating</h6>
              <div className="text-2xl font-bold text-slate-700">
                {isPercentile ? `${(ratingData.power_rating_percentile || 50).toFixed(0)}%` : (ratingData.trend_rating || 0).toFixed(2)}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Goal Threat</h6>
              <div className="text-2xl font-bold text-slate-700">
                {isPercentile ? `${(ratingData.goal_threat_percentile || 50).toFixed(0)}%` : (ratingData.trend_goal_threat || 0).toFixed(3)}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Attendance</h6>
              <div className="text-2xl font-bold text-slate-700">
                {isPercentile ? '50%' : `${(ratingData.trend_participation || 0).toFixed(0)}%`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center p-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 text-slate-400 bg-slate-100 rounded-xl mb-4">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h6 className="mb-1 text-lg">No data available</h6>
            <p className="mb-0 text-sm text-slate-400">No historical performance data found for this player</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-wrap justify-start -mx-3">
      {/* Header Card */}
      <div className="w-full px-3 mb-6">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
          <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
            <div className="flex items-center gap-4">
        <div className="w-64">
          {error && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Error: {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Player</label>
            <select
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a player...</option>
              {players.map(p => (
                <option key={p.player_id} value={p.player_id.toString()}>
                  {p.name} {p.isRinger ? '(Ringer)' : ''}
                </option>
              ))}
            </select>
          </div>
          {players.length === 0 && !loading && !error && (
                  <div className="text-slate-400 text-sm mt-1">
              No players found
            </div>
          )}
        </div>
              
              {selectedPlayer && (
                <div className="flex items-center text-slate-600">
                  <h5 className="mb-0 font-semibold">
                    {players.find(p => p.player_id.toString() === selectedPlayer)?.name}
                  </h5>
        </div>
              )}
      </div>

      {dataError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Error loading data: {dataError}
        </div>
      )}

      {dataLoading && (
              <div className="mt-4 flex items-center justify-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <span className="ml-2 text-slate-600">Loading player data...</span>
              </div>
      )}
          </div>
        </div>
      </div>

      {/* Tables */}
      {ratingData && !dataLoading && (
        <>
          <div className="w-full px-3">
            {renderTable('Raw Values')}
          </div>
          <div className="w-full px-3">
            {renderTable('Percentile Values', true)}
          </div>
        </>
      )}
    </div>
  );
}; 