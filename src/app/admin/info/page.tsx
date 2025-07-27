'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import Button from '@/components/ui-kit/Button.component';
// Removed Table components from ui-kit to use direct HTML with Tailwind for style consistency

// import { triggerEdgeFunctions as triggerStatsUpdate } from '@/services/statsUpdate.service'; // No longer needed
import { format } from 'date-fns';

interface CacheMetadata {
  cache_key: string;
  last_invalidated: string;
  dependency_type: string;
}

interface AbsenteePlayer {
  player_id: number;
  name: string;
  totalGamesPlayed: number;
  lastGamePlayedDate: string | null;
  daysAbsent: number;
}

interface ShowOnStatsPlayer {
  player_id: number;
  name: string;
  is_ringer?: boolean;
  is_retired?: boolean;
  totalGamesPlayed: number;
  gamesPlayedThisYear: number;
}

// EWMA Rating interfaces
interface Player {
  player_id: number;
  name: string;
  isRinger: boolean;
}

interface EwmaRatingData {
  power_rating: number;
  goal_threat: number;
  participation: number;
  power_percentile: number;
  goal_percentile: number;
  participation_percentile: number;
  is_qualified: boolean;
  weighted_played: number;
  half_life_days: number;
}

interface PlayerRatingData {
  ewmaRatings?: EwmaRatingData | null;
}

const AdminInfoPage = () => {
  const [cacheMetadata, setCacheMetadata] = useState<CacheMetadata[]>([]);
  const [absentees, setAbsentees] = useState<AbsenteePlayer[]>([]);
  const [ringersToConsider, setRingersToConsider] = useState<ShowOnStatsPlayer[]>([]);
  
  const [isLoadingCache, setIsLoadingCache] = useState<boolean>(true);
  const [isLoadingInfoData, setIsLoadingInfoData] = useState<boolean>(true);
  const [isUpdatingStats, setIsUpdatingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Add state for button success flash
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const [matchReportHealth, setMatchReportHealth] = useState<any>(null);
  const [showMatchReportHealth, setShowMatchReportHealth] = useState<boolean>(false);
  
  // EWMA Rating state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [ratingData, setRatingData] = useState<PlayerRatingData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const fetchCacheMetadata = useCallback(async () => {
    setIsLoadingCache(true);
    setError(null);
    try {
      // Add a cache-busting query parameter
      const cacheBuster = `_=${new Date().getTime()}`;
      const response = await fetch(`/api/cache-metadata?${cacheBuster}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cache metadata: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        setCacheMetadata(result.data);
      } else {
        throw new Error(result.error || 'Failed to load cache metadata');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoadingCache(false);
    }
  }, []);

  const fetchInfoData = useCallback(async () => {
    setIsLoadingInfoData(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/info-data');
      if (!response.ok) {
        throw new Error(`Failed to fetch info data: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        setAbsentees(result.data.absentees);
        setRingersToConsider(result.data.showOnStatsPlayers);
      } else {
        throw new Error(result.error || 'Failed to load info data');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoadingInfoData(false);
    }
  }, []);

  // EWMA Rating fetch functions
  const fetchPlayers = useCallback(async () => {
    setPlayersLoading(true);
    setPlayersError(null);
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
      setPlayersError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  const fetchPlayerData = useCallback(async (playerId: string) => {
    setDataLoading(true);
    setDataError(null);
    try {
      // Use the simplified rating-data API for EWMA-only data
      const res = await fetch(`/api/admin/rating-data?id=${playerId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setRatingData(data.data || null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load rating data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCacheMetadata();
    fetchInfoData();
    fetchPlayers();
  }, [fetchCacheMetadata, fetchInfoData, fetchPlayers]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerData(selectedPlayer);
    }
  }, [selectedPlayer, fetchPlayerData]);

  const fetchDebugInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/debug-revalidation');
      if (response.ok) {
        const result = await response.json();
        setDebugInfo(result.data);
      } else {
        console.warn('Could not fetch debug info:', response.status);
      }
    } catch (err) {
      console.warn('Debug info fetch failed:', err);
    }
  }, []);

  const fetchMatchReportHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/match-report-health');
      if (response.ok) {
        const result = await response.json();
        setMatchReportHealth(result.health);
      } else {
        console.warn('Could not fetch match report health:', response.status);
      }
    } catch (err) {
      console.warn('Match report health fetch failed:', err);
    }
  }, []);

  const handleUpdateStats = async () => {
    setIsUpdatingStats(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/trigger-stats-update', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          // Try to parse it as JSON, as some errors might be structured
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Failed to trigger stats update: ${response.statusText}`);
        } catch (e) {
          // If it's not JSON, use the raw text
          throw new Error(errorText || `Failed to trigger stats update with status: ${response.statusText}`);
        }
      }

      const result = await response.json();
      if (!result.success) {
        // Use the user-friendly message and add summary if available
        let userMessage = result.message || result.error || 'An unknown error occurred during stats update.';
        
        // Add summary information if available
        if (result.summary) {
          const { total_functions, function_failures, revalidation_failures } = result.summary;
          userMessage += `\n\nSummary:\n• Functions: ${total_functions - function_failures}/${total_functions} succeeded\n• Cache Invalidations: ${total_functions - revalidation_failures}/${total_functions} succeeded`;
          
          if (result.summary.failed_tags && result.summary.failed_tags.length > 0) {
            userMessage += `\n• Failed tags: ${result.summary.failed_tags.join(', ')}`;
          }
        }
        
        throw new Error(userMessage);
      }
      
      // Success case - use button flash instead of green popup
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      
      // Refresh the cache metadata to show new timestamps
      await fetchCacheMetadata(); 
    } catch (err: any) {
      console.error('Error triggering stats update:', err);
      setError(err.message || 'Failed to trigger stats update.');
    } finally {
      setIsUpdatingStats(false);
    }
  };

  // EWMA Rating helper functions
  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    return value ? value.toFixed(decimals) : 'N/A';
  };

  // EWMA section renderer
  const renderEwmaComparison = () => {
    if (!ratingData?.ewmaRatings) return null;
    
    const ewma = ratingData.ewmaRatings;
    
    return (
             <div className="p-4">
         {/* Main metrics grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div className="bg-white p-4 rounded-lg border border-gray-200">
             <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Power Rating</h6>
             <div className="text-2xl font-bold text-slate-700 mb-1">
               {formatNumber(ewma.power_rating, 2)}
             </div>
             <div className="text-sm text-slate-600">
               {formatNumber(ewma.power_percentile, 1)}th percentile
             </div>
           </div>
           
           <div className="bg-white p-4 rounded-lg border border-gray-200">
             <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Goal Threat</h6>
             <div className="text-2xl font-bold text-slate-700 mb-1">
               {formatNumber(ewma.goal_threat, 3)}
             </div>
             <div className="text-sm text-slate-600">
               {formatNumber(ewma.goal_percentile, 1)}th percentile
             </div>
           </div>
           
           <div className="bg-white p-4 rounded-lg border border-gray-200">
             <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Participation</h6>
             <div className="text-2xl font-bold text-slate-700 mb-1">
               {formatNumber(ewma.participation, 1)}%
             </div>
             <div className="text-sm text-slate-600">
               {formatNumber(ewma.participation_percentile, 1)}th percentile
             </div>
           </div>
         </div>
         
         {/* Metadata */}
         <div className="pt-4 border-t border-gray-200 text-sm text-slate-600 bg-white border border-gray-200 rounded-lg p-4">
           <h6 className="font-semibold mb-3 text-slate-700">EWMA System Details</h6>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <span className="font-medium">Weighted games:</span> {formatNumber(ewma.weighted_played, 1)}
             </div>
             <div>
               <span className="font-medium">Qualified:</span> {ewma.is_qualified ? 'Yes' : 'No'}
             </div>
             <div>
               <span className="font-medium">Half-life:</span> {ewma.half_life_days} days (2 years)
             </div>
           </div>
         </div>
       </div>
    );
  };

  const renderTable = (columns: { key: string; label: string; isNumeric?: boolean; formatter?: (value: any, row: any) => React.ReactNode | string }[], data: any[]) => (
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse text-slate-500" style={{ width: 'auto' }}>
        <thead className="align-bottom sticky top-0 bg-white z-10 shadow-sm">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`p-2 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70 ${col.isNumeric ? 'text-center' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-sm text-gray-500 border-b">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td key={col.key} className={`p-2 align-middle bg-transparent border-b whitespace-nowrap ${col.isNumeric ? 'text-center' : 'text-left'}`}>
                    <span className={`leading-normal text-sm ${col.isNumeric ? 'font-normal' : 'font-semibold'}`}>
                      {col.formatter ? col.formatter(row[col.key], row) : row[col.key]}
                    </span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const cacheTableColumns = [
    { key: 'cache_key', label: 'Cache Key', isNumeric: false },
    { key: 'last_invalidated', label: 'Last Updated', isNumeric: false, formatter: (dateStr: string) => format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss') },
  ];

  const absenteeTableColumns= [
    { key: 'name', label: 'Player', isNumeric: false },
    { key: 'totalGamesPlayed', label: 'Total Games', isNumeric: true },
    { key: 'lastGamePlayedDate', label: 'Last Played', isNumeric: true, formatter: (dateStr: string | null) => dateStr ? format(new Date(dateStr), 'yyyy-MM-dd') : 'N/A' },
    { key: 'daysAbsent', label: 'Days Absent', isNumeric: true },
  ];

  const ringersTableColumns = [
    { key: 'name', label: 'Player', isNumeric: false },
    { key: 'totalGamesPlayed', label: 'Total Games Played', isNumeric: true },
    { key: 'gamesPlayedThisYear', label: 'Games This Year', isNumeric: true },
  ];

  return (
    <MainLayout>
      <AdminLayout>
        <div className="w-full px-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg shadow-soft-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Stats Update Failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <pre className="whitespace-pre-wrap font-sans">{error}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}



          <ErrorBoundary>
            <div className="flex flex-wrap gap-6">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Stats Last Updated At</h3>
                </div>
                <div className="p-4">
                  {isLoadingCache ? (
                    <p className="text-center text-sm text-slate-500">Loading cache data...</p>
                  ) : (
                    renderTable(cacheTableColumns, cacheMetadata)
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      variant={updateSuccess ? "primary" : "secondary"}
                      className={`rounded-lg shadow-soft-sm ${
                        updateSuccess ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : ''
                      }`}
                      onClick={handleUpdateStats} 
                      disabled={isUpdatingStats}
                    >
                      {isUpdatingStats ? 'Updating...' : updateSuccess ? 'Updated' : 'Update Stats'}
                    </Button>
                    <Button 
                      variant="secondary"
                      className="rounded-lg shadow-soft-sm"
                      onClick={() => {
                        setShowDebugInfo(!showDebugInfo);
                        if (!showDebugInfo && !debugInfo) {
                          fetchDebugInfo();
                        }
                      }}
                      disabled={isUpdatingStats}
                    >
                      Debug
                    </Button>
                    <Button 
                      variant="secondary"
                      className="rounded-lg shadow-soft-sm"
                      onClick={() => {
                        setShowMatchReportHealth(!showMatchReportHealth);
                        if (!showMatchReportHealth && !matchReportHealth) {
                          fetchMatchReportHealth();
                        }
                      }}
                      disabled={isUpdatingStats}
                    >
                      Health
                    </Button>
                  </div>
                  
                  {showDebugInfo && debugInfo && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                      <h4 className="font-semibold mb-2 text-gray-700">Revalidation Health Check</h4>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 ${debugInfo.diagnosis.overallHealth ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{debugInfo.diagnosis.overallHealth ? '✅' : '❌'}</span>
                          <span>Overall Health: {debugInfo.diagnosis.overallHealth ? 'Good' : 'Issues Detected'}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${debugInfo.diagnosis.canBuildUrl ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{debugInfo.diagnosis.canBuildUrl ? '✅' : '❌'}</span>
                          <span>URL Construction: {debugInfo.urlConstruction.urlSource || 'Failed'}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${debugInfo.diagnosis.hasAuthToken ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{debugInfo.diagnosis.hasAuthToken ? '✅' : '❌'}</span>
                          <span>Auth Token: {debugInfo.diagnosis.hasAuthToken ? 'Present' : 'Missing'}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${debugInfo.diagnosis.canReachEndpoint ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{debugInfo.diagnosis.canReachEndpoint ? '✅' : '❌'}</span>
                          <span>Endpoint: {debugInfo.revalidationEndpointTest.success ? 'Reachable' : `Failed (${debugInfo.revalidationEndpointTest.status || 'Network'})`}</span>
                        </div>
                      </div>
                      {debugInfo.urlConstruction.finalUrl && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-gray-600">URL: </span>
                          <span className="font-mono text-xs break-all">{debugInfo.urlConstruction.finalUrl}</span>
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Environment: </span>
                        <span className="font-mono">{debugInfo.environment.NODE_ENV}</span>
                        {debugInfo.environment.VERCEL_ENV && (
                          <>
                            <span className="text-gray-600 ml-2">Vercel: </span>
                            <span className="font-mono">{debugInfo.environment.VERCEL_ENV}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {showMatchReportHealth && matchReportHealth && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs">
                      <h4 className="font-semibold mb-2 text-blue-700">Match Report Health Check</h4>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 ${
                          matchReportHealth.status === 'healthy' ? 'text-green-600' :
                          matchReportHealth.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          <span>{
                            matchReportHealth.status === 'healthy' ? '✅' :
                            matchReportHealth.status === 'degraded' ? '⚠️' : '❌'
                          }</span>
                          <span>Status: {matchReportHealth.status}</span>
                        </div>
                        
                        {/* Data Sources */}
                        <div className="space-y-1 mt-2">
                          <div className="text-gray-700 font-medium">Data Sources:</div>
                          {matchReportHealth.data_sources?.aggregated_match_report && (
                            <div className={`flex items-center gap-2 ml-2 ${
                              matchReportHealth.data_sources.aggregated_match_report.status === 'available' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <span>{matchReportHealth.data_sources.aggregated_match_report.status === 'available' ? '✅' : '❌'}</span>
                              <span>Main Cache: {matchReportHealth.data_sources.aggregated_match_report.status}</span>
                              {matchReportHealth.data_sources.aggregated_match_report.feat_count > 0 && (
                                <span className="text-purple-600">({matchReportHealth.data_sources.aggregated_match_report.feat_count} feats)</span>
                              )}
                            </div>
                          )}
                          {matchReportHealth.data_sources?.matches_fallback && (
                            <div className={`flex items-center gap-2 ml-2 ${
                              matchReportHealth.data_sources.matches_fallback.status === 'available' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <span>{matchReportHealth.data_sources.matches_fallback.status === 'available' ? '✅' : '❌'}</span>
                              <span>Fallback: {matchReportHealth.data_sources.matches_fallback.status}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Cache Info */}
                        {matchReportHealth.cache_info && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="text-gray-700 font-medium">Cache Info:</div>
                            <div className="ml-2 space-y-1">
                              <div>Last invalidated: {matchReportHealth.cache_info.hours_since_invalidation}h ago</div>
                              {matchReportHealth.cache_info.is_stale && (
                                <div className="text-orange-600">⚠️ Cache may be stale</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Issues */}
                        {matchReportHealth.issues && matchReportHealth.issues.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="text-red-700 font-medium">Issues:</div>
                            <ul className="ml-2 list-disc list-inside space-y-0">
                              {matchReportHealth.issues.map((issue: string, index: number) => (
                                <li key={index} className="text-red-600">{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Recommendations */}
                        {matchReportHealth.recommendations && matchReportHealth.recommendations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <div className="text-blue-700 font-medium">Recommendations:</div>
                            <ul className="ml-2 list-disc list-inside space-y-0">
                              {matchReportHealth.recommendations.map((rec: string, index: number) => (
                                <li key={index} className="text-blue-600">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Absentee Players (&gt;50 Days)</h3>
                </div>
                <div className="p-4">
                  {isLoadingInfoData ? (
                    <p className="text-center text-sm text-slate-500">Loading absentee data...</p>
                  ) : (
                    renderTable(absenteeTableColumns, absentees)
                  )}
                </div>
              </div>

              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Ringers To Add To Stats?</h3>
                </div>
                <div className="p-4">
                  {isLoadingInfoData ? (
                    <p className="text-center text-sm text-slate-500">Loading ringers data...</p>
                  ) : (
                    renderTable(ringersTableColumns, ringersToConsider)
                  )}
                </div>
              </div>
              
              {/* EWMA Performance Ratings Section */}
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">EWMA Performance Ratings</h3>
                  <p className="mb-0 text-sm text-slate-500">2-year half-life exponentially weighted moving averages</p>
                </div>
                
                                 <div className="p-4 border-b border-gray-200">
                   {playersError && (
                     <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                       Error: {playersError}
                     </div>
                   )}
                   <div className="w-64">
                     <label className="block text-sm font-medium text-gray-700 mb-2">Player</label>
                     <select
                       value={selectedPlayer}
                       onChange={e => setSelectedPlayer(e.target.value)}
                       disabled={playersLoading}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     >
                       <option value="">Select a player...</option>
                       {players.map(p => (
                         <option key={p.player_id} value={p.player_id.toString()}>
                           {p.name} {p.isRinger ? '(Ringer)' : ''}
                         </option>
                       ))}
                     </select>
                     {players.length === 0 && !playersLoading && !playersError && (
                       <div className="text-slate-400 text-sm mt-1">
                         No players found
                       </div>
                     )}
                   </div>
                 </div>

                {dataError && (
                  <div className="p-4 border-b border-gray-200">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      Error loading data: {dataError}
                    </div>
                  </div>
                )}

                {dataLoading && (
                  <div className="p-4 flex items-center justify-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                    </div>
                    <span className="ml-2 text-slate-600">Loading player data...</span>
                  </div>
                )}
                
                {/* EWMA Performance Data Display */}
                {ratingData && !dataLoading && ratingData.ewmaRatings ? (
                  renderEwmaComparison()
                ) : ratingData && !dataLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 text-slate-400 bg-slate-100 rounded-xl mb-4">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h6 className="mb-1 text-lg">No EWMA data available</h6>
                      <p className="mb-0 text-sm text-slate-400">No EWMA performance data found for this player</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </AdminLayout>
    </MainLayout>
  );
}

export default AdminInfoPage; 