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

const AdminInfoPage = () => {
  const [cacheMetadata, setCacheMetadata] = useState<CacheMetadata[]>([]);
  const [absentees, setAbsentees] = useState<AbsenteePlayer[]>([]);
  const [ringersToConsider, setRingersToConsider] = useState<ShowOnStatsPlayer[]>([]);
  
  const [isLoadingCache, setIsLoadingCache] = useState<boolean>(true);
  const [isLoadingInfoData, setIsLoadingInfoData] = useState<boolean>(true);
  const [isUpdatingStats, setIsUpdatingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchCacheMetadata();
    fetchInfoData();
  }, [fetchCacheMetadata, fetchInfoData]);

  const handleUpdateStats = async () => {
    setIsUpdatingStats(true);
    setError(null);
    try {
      // await triggerStatsUpdate(); // Old client-side call
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
        throw new Error(result.error || 'An unknown error occurred during stats update.');
      }
      
      // If successful, refresh the cache metadata
      await fetchCacheMetadata(); 
      // Optionally, display a success message to the user
      // alert('Stats update triggered successfully!'); 
    } catch (err: any) {
      console.error('Error triggering stats update:', err);
      setError(err.message || 'Failed to trigger stats update.');
    } finally {
      setIsUpdatingStats(false);
    }
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
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
              <p>{`Error: ${error}`}</p>
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
                <div className="p-4 border-t border-gray-200">
                  <Button 
                    variant="secondary"
                    className="rounded-lg shadow-soft-sm"
                    onClick={handleUpdateStats} 
                    disabled={isUpdatingStats}
                  >
                    {isUpdatingStats ? 'Updating...' : 'Update'}
                  </Button>
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
                    <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
                      {renderTable(absenteeTableColumns, absentees)}
                    </div>
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
                    <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
                      {renderTable(ringersTableColumns, ringersToConsider)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </AdminLayout>
    </MainLayout>
  );
}

export default AdminInfoPage; 