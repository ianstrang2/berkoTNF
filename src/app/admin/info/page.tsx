'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import Button from '@/components/ui-kit/Button.component';
// Removed Table components from ui-kit to use direct HTML with Tailwind for style consistency

import { format } from 'date-fns';
import { shouldUseBackgroundJobs } from '@/config/feature-flags';

interface CacheMetadata {
  cache_key: string;
  last_invalidated: string;
  dependency_type: string;
}

interface AbsenteePlayer {
  id: string;
  name: string;
  totalGamesPlayed: number;
  lastGamePlayedDate: string | null;
  daysAbsent: number;
}

interface ShowOnStatsPlayer {
  id: string;
  name: string;
  isRinger?: boolean;
  isRetired?: boolean;
  totalGamesPlayed: number;
  gamesPlayedThisYear: number;
}

interface BackgroundJobStatus {
  id: string;
  job_type: string;
  job_payload: {
    triggeredBy: 'post-match' | 'admin' | 'cron';
    matchId?: number;
    requestId: string;
    userId?: string;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

// EWMA Rating interfaces
interface Player {
  id: string;
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
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [showSystemHealth, setShowSystemHealth] = useState<boolean>(false);
  const [isLoadingSystemHealth, setIsLoadingSystemHealth] = useState<boolean>(false);
  
  // EWMA Rating state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [ratingData, setRatingData] = useState<PlayerRatingData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);

  // Player Profiles state
  const [profileMetadata, setProfileMetadata] = useState<any>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);
  const [isUpdatingProfiles, setIsUpdatingProfiles] = useState<boolean>(false);
  const [isResettingProfiles, setIsResettingProfiles] = useState<boolean>(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<boolean>(false);
  const [profileResetSuccess, setProfileResetSuccess] = useState<boolean>(false);

  // Background Job Status state
  const [jobStatusData, setJobStatusData] = useState<BackgroundJobStatus[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [jobError, setJobError] = useState<string | null>(null);

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

  // Player Profiles functions
  const fetchProfileMetadata = useCallback(async () => {
    setIsLoadingProfiles(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/player-profile-metadata');
      if (!response.ok) {
        throw new Error(`Failed to fetch profile metadata: ${response.statusText}`);
      }
      const data = await response.json();
      setProfileMetadata(data);
    } catch (err: any) {
      console.error('Error fetching profile metadata:', err);
      setError(err.message || 'Failed to fetch profile metadata.');
    } finally {
      setIsLoadingProfiles(false);
    }
  }, []);

  const handleUpdateProfiles = async () => {
    setIsUpdatingProfiles(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/trigger-player-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 100 }) // Process all eligible players
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Failed to trigger profile update: ${response.statusText}`);
        } catch (e) {
          throw new Error(errorText || `Failed to trigger profile update with status: ${response.statusText}`);
        }
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || result.error || 'An unknown error occurred during profile update.');
      }
      
      // Success case
      setProfileUpdateSuccess(true);
      setTimeout(() => setProfileUpdateSuccess(false), 2000);
      
      // Refresh the profile metadata
      await fetchProfileMetadata(); 
    } catch (err: any) {
      console.error('Error triggering profile update:', err);
      setError(err.message || 'Failed to trigger profile update.');
    } finally {
      setIsUpdatingProfiles(false);
    }
  };

  const handleResetProfiles = async () => {
    if (!confirm('This will delete ALL existing player profiles and regenerate them. Are you sure?')) {
      return;
    }

    setIsResettingProfiles(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/reset-player-profiles', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Failed to reset profiles: ${response.statusText}`);
        } catch (e) {
          throw new Error(errorText || `Failed to reset profiles with status: ${response.statusText}`);
        }
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'An unknown error occurred during profile reset.');
      }
      
      // Success case
      setProfileResetSuccess(true);
      setTimeout(() => setProfileResetSuccess(false), 2000);
      
      // Refresh the profile metadata
      await fetchProfileMetadata(); 
    } catch (err: any) {
      console.error('Error resetting profiles:', err);
      setError(err.message || 'Failed to reset profiles.');
    } finally {
      setIsResettingProfiles(false);
    }
  };

  // Background Job Status functions
  const fetchJobStatus = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobError(null);
    try {
      const response = await fetch('/api/admin/background-jobs');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch job status');
      }
      
      setJobStatusData(result.data || []);
    } catch (err: any) {
      console.error('Error fetching job status:', err);
      setJobError(err.message);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  const handleRetryJob = async (jobId: string) => {
    try {
      // Show loading state for the specific job being retried
      setJobStatusData(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'queued' as const } 
          : job
      ));

      // Re-enqueue the failed job
      const response = await fetch('/api/admin/enqueue-stats-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggeredBy: 'admin',
          requestId: crypto.randomUUID(),
          userId: 'admin',
          retryOf: jobId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to retry job');
      }
      
      // Refresh job status to show the new retry job
      await fetchJobStatus();
      
      // Show success feedback
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      console.log('Job retry queued successfully');
      
    } catch (err: any) {
      console.error(`Failed to retry job: ${err.message}`);
      setError(`Failed to retry job: ${err.message}`);
      
      // Revert the optimistic update on error
      await fetchJobStatus();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const calculateDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return 'N/A';
    if (!completedAt) return 'In progress...';
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const durationSeconds = Math.round(durationMs / 1000);
    
    return `${durationSeconds}s`;
  };

  // Smart table display logic
  const hasRecentJobs = jobStatusData.some(job => 
    new Date(job.created_at) > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
  );

  const hasStuckJobs = jobStatusData.some(job => 
    job.status === 'queued' && 
    new Date(job.created_at) < new Date(Date.now() - 5 * 60 * 1000) // Queued for 5+ minutes
  );

  const isBackgroundJobsEnabled = shouldUseBackgroundJobs('admin');

  // Dynamic headers based on system state
  const getJobTableHeader = () => {
    if (hasStuckJobs) {
      return {
        title: "Background Job Status ⚠️",
        subtitle: "Recent jobs (worker may be down - jobs stuck)"
      };
    }
    if (hasRecentJobs) {
      return {
        title: "Background Job Status",
        subtitle: "Recent stats update jobs and their status"
      };
    }
    return {
      title: "Background Job Status",
      subtitle: isBackgroundJobsEnabled 
        ? "No recent background jobs" 
        : "Background processing disabled"
    };
  };

  const getCacheTableHeader = () => {
    if (hasRecentJobs && hasStuckJobs) {
      return {
        title: "Stats Cache Status (Fallback Active)",
        subtitle: "Edge functions are handling stats updates"
      };
    }
    if (hasRecentJobs && isBackgroundJobsEnabled) {
      return {
        title: "Stats Cache Status",
        subtitle: "Legacy cache timestamps (background jobs active)"
      };
    }
    return {
      title: "Stats Last Updated At",
      subtitle: "Current stats cache status via edge functions"
    };
  };

  // Smart retry logic: only show retry for most recent failed job if no successful job came after it
  const shouldShowRetryButton = (job: BackgroundJobStatus, jobIndex: number) => {
    if (job.status !== 'failed') return false;
    
    // Find the most recent successful job
    const mostRecentSuccessfulJob = jobStatusData.find(j => j.status === 'completed');
    
    // If there's a successful job that's more recent than this failed job, don't show retry
    if (mostRecentSuccessfulJob && 
        new Date(mostRecentSuccessfulJob.created_at) > new Date(job.created_at)) {
      return false;
    }
    
    // Only show retry for the most recent failed job (first in the sorted list)
    const mostRecentFailedJobIndex = jobStatusData.findIndex(j => j.status === 'failed');
    return jobIndex === mostRecentFailedJobIndex;
  };

  useEffect(() => {
    fetchCacheMetadata();
    fetchInfoData();
    fetchPlayers();
    fetchProfileMetadata();
    fetchJobStatus();
  }, [fetchCacheMetadata, fetchInfoData, fetchPlayers, fetchProfileMetadata, fetchJobStatus]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerData(selectedPlayer);
    }
  }, [selectedPlayer, fetchPlayerData]);

  // Auto-refresh job status for active jobs with smart intervals
  useEffect(() => {
    const hasActiveJobs = jobStatusData.some(job => 
      job.status === 'queued' || job.status === 'processing'
    );
    
    if (!hasActiveJobs) return;

    // More frequent refresh when jobs are active (every 5 seconds)
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing job status (active jobs detected)');
      fetchJobStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [jobStatusData, fetchJobStatus]);

  // Auto-refresh cache metadata when background jobs complete
  useEffect(() => {
    const completedJobs = jobStatusData.filter(job => job.status === 'completed');
    
    if (completedJobs.length > 0) {
      // Check if we have a recently completed job (within last 10 seconds)
      const recentlyCompleted = completedJobs.some(job => {
        const completedTime = new Date(job.completed_at || job.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - completedTime.getTime();
        return timeDiff < 10000; // 10 seconds
      });

      if (recentlyCompleted) {
        console.log('🔄 Refreshing cache metadata due to recently completed background job');
        fetchCacheMetadata();
      }
    }
  }, [jobStatusData, fetchCacheMetadata]);

  // Less frequent refresh for completed jobs (every 2 minutes) to catch any missed updates
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActiveJobs = jobStatusData.some(job => 
        job.status === 'queued' || job.status === 'processing'
      );
      
      if (!hasActiveJobs && jobStatusData.length > 0) {
        console.log('🔄 Periodic job status refresh');
        fetchJobStatus();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [jobStatusData, fetchJobStatus]);

  const fetchSystemHealth = useCallback(async () => {
    setIsLoadingSystemHealth(true);
    try {
      const response = await fetch('/api/admin/system-health');
      if (response.ok) {
        const result = await response.json();
        setSystemHealth(result.health);
      } else {
        console.warn('Could not fetch system health:', response.status);
        setSystemHealth(null);
      }
    } catch (err) {
      console.warn('System health fetch failed:', err);
      setSystemHealth(null);
    } finally {
      setIsLoadingSystemHealth(false);
    }
  }, []);

  const handleUpdateStats = async () => {
    setIsUpdatingStats(true);
    setError(null);
    
    // Optimistic update: Add a temporary job to the list
    const tempJobId = `temp-${Date.now()}`;
    const optimisticJob: BackgroundJobStatus = {
      id: tempJobId,
      job_type: 'stats_update',
      job_payload: {
        triggeredBy: 'admin',
        requestId: crypto.randomUUID(),
        userId: 'admin'
      },
      status: 'queued',
      started_at: null,
      completed_at: null,
      retry_count: 0,
      error_message: null,
      created_at: new Date().toISOString()
    };
    
    // Add optimistic job to the list
    setJobStatusData(prev => [optimisticJob, ...prev]);
    
    try {
      // Use the shared trigger function with feature flag support
      await triggerStatsUpdate('admin');
      
      // Success case - use button flash instead of green popup
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      
      // Refresh both cache metadata and job status
      await Promise.all([
        fetchCacheMetadata(),
        fetchJobStatus() // This will replace the optimistic job with real data
      ]);
      
    } catch (err: any) {
      console.error('Error triggering stats update:', err);
      setError(err.message || 'Failed to trigger stats update.');
      
      // Remove the optimistic job on error
      setJobStatusData(prev => prev.filter(job => job.id !== tempJobId));
    } finally {
      setIsUpdatingStats(false);
    }
  };

  // Legacy implementation for fallback compatibility
  const handleUpdateStatsLegacy = async () => {
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
    <div className="w-full">
      <table className="w-full border-collapse text-slate-500">
        <thead>
          <tr className="sticky top-0 bg-white z-10 shadow-sm">
            {columns.map((col) => (
              <th key={col.key} className={`p-3 font-bold uppercase align-middle bg-white border-b-2 border-gray-200 text-xs tracking-wide whitespace-nowrap text-slate-600 ${col.isNumeric ? 'text-center' : 'text-left'}`}>
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
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className={`p-3 align-middle border-b border-gray-100 text-sm ${col.isNumeric ? 'text-center' : 'text-left'}`}>
                    {col.formatter ? col.formatter(row[col.key], row) : row[col.key]}
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

  const playersListColumns = [
    { key: 'name', label: 'Player', isNumeric: false },
    { 
      key: 'is_retired', 
      label: 'Retired', 
      isNumeric: false, 
      formatter: (value: boolean) => value ? 'Yes' : 'No'
    },
    { 
      key: 'is_ringer', 
      label: 'Ringer', 
      isNumeric: false, 
      formatter: (value: boolean) => value ? 'Yes' : 'No'
    },
    { 
      key: 'profile_generated_at', 
      label: 'Profile Last Updated', 
      isNumeric: false, 
      formatter: (dateStr: string | null) => dateStr ? format(new Date(dateStr), 'yyyy-MM-dd HH:mm') : 'Never'
    },
  ];

  return (
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
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">{getCacheTableHeader().title}</h3>
                  <p className="mb-0 text-sm text-slate-500">{getCacheTableHeader().subtitle}</p>
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
                        setShowSystemHealth(!showSystemHealth);
                        if (!showSystemHealth) {
                          fetchSystemHealth();
                        }
                      }}
                      disabled={isUpdatingStats || isLoadingSystemHealth}
                    >
                      {isLoadingSystemHealth ? 'Testing...' : 'System Health'}
                    </Button>
                  </div>
                  
                  {showSystemHealth && systemHealth && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-700">System Health Check</h4>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          systemHealth.overall_status === 'healthy' ? 'bg-green-100 text-green-800' :
                          systemHealth.overall_status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {systemHealth.overall_status.toUpperCase()}
                        </div>
                      </div>
                      
                      {/* Feature Flags Status */}
                      <div className="mb-3 p-2 bg-blue-50 rounded">
                        <div className="font-medium text-blue-800 mb-1">Active Configuration:</div>
                        <div className="text-xs space-y-1">
                          <div>Background Jobs: {systemHealth.feature_flags.effective.admin ? '✅ Enabled' : '❌ Disabled'}</div>
                          <div>Edge Functions: {!systemHealth.feature_flags.effective.admin ? '✅ Active' : '⏸️ Standby'}</div>
                        </div>
                      </div>

                      {/* System Status */}
                      <div className="space-y-2">
                        {Object.entries(systemHealth.systems).map(([systemName, system]: [string, any]) => (
                          system.active && (
                            <div key={systemName} className="border-l-2 border-gray-300 pl-2">
                              <div className={`flex items-center gap-2 font-medium ${
                                system.status === 'healthy' ? 'text-green-600' :
                                system.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                <span>{
                                  system.status === 'healthy' ? '✅' :
                                  system.status === 'degraded' ? '⚠️' : '❌'
                                }</span>
                                <span>{systemName.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                              </div>
                              <div className="ml-6 mt-1 space-y-1">
                                {system.tests.map((test: any, idx: number) => (
                                  <div key={idx} className={`flex items-center gap-2 text-xs ${
                                    test.status === 'pass' ? 'text-green-600' :
                                    test.status === 'fail' ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    <span>{test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '○'}</span>
                                    <span>{test.name}: {test.message}</span>
                                    {test.duration && <span className="text-gray-400">({test.duration}ms)</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>

                      {/* Recommendations */}
                      {systemHealth.recommendations.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <div className="font-medium text-gray-700 mb-1">Recommendations:</div>
                          <ul className="ml-2 list-disc list-inside space-y-1 text-xs">
                            {systemHealth.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="text-gray-600">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border flex flex-col" style={{ height: '700px' }}>
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Player Profiles Last Updated At</h3>
                </div>
                <div className="p-4 flex-1 overflow-hidden">
                  {isLoadingProfiles ? (
                    <p className="text-center text-sm text-slate-500">Loading profile data...</p>
                  ) : profileMetadata?.players_list?.length > 0 ? (
                    <div className="h-full overflow-y-auto">
                      {renderTable(playersListColumns, profileMetadata.players_list)}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-500">No profile data available</p>
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                  <div className="flex gap-2">
                    <Button 
                      variant={profileUpdateSuccess ? "primary" : "secondary"}
                      className={`rounded-lg shadow-soft-sm ${
                        profileUpdateSuccess ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : ''
                      }`}
                      onClick={handleUpdateProfiles} 
                      disabled={isUpdatingProfiles || isResettingProfiles}
                    >
                      {isUpdatingProfiles ? 'Updating...' : profileUpdateSuccess ? 'Updated' : 'Update Profiles'}
                    </Button>
                    <Button 
                      variant={profileResetSuccess ? "primary" : "secondary"}
                      className={`rounded-lg shadow-soft-sm ${
                        profileResetSuccess ? 'bg-gradient-to-tl from-red-700 to-pink-500 text-white' : ''
                      }`}
                      onClick={handleResetProfiles}
                      disabled={isUpdatingProfiles || isResettingProfiles}
                    >
                      {isResettingProfiles ? 'Resetting...' : profileResetSuccess ? 'Reset' : 'Reset & Regenerate'}
                    </Button>
                  </div>
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
                         <option key={p.id} value={p.id}>
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

              {/* Background Job Status Section */}
              <ErrorBoundary>
                <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                  <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="mb-0 text-lg font-semibold text-slate-700">{getJobTableHeader().title}</h3>
                        <p className="mb-0 text-sm text-slate-500">
                          {getJobTableHeader().subtitle}
                          {jobStatusData.some(job => job.status === 'queued' || job.status === 'processing') && (
                            <span className="ml-2 inline-flex items-center">
                              <span className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                              <span className="text-blue-600 text-xs">Auto-refreshing every 5s</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={fetchJobStatus}
                        disabled={isLoadingJobs}
                        className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        title="Refresh job status"
                      >
                        {isLoadingJobs ? (
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></span>
                        ) : (
                          '🔄 Refresh'
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    {isLoadingJobs ? (
                      <p className="text-center text-sm text-slate-500">Loading job status...</p>
                    ) : jobError ? (
                      <p className="text-center text-sm text-red-500">Error loading jobs: {jobError}</p>
                    ) : jobStatusData.length === 0 ? (
                      <p className="text-center text-sm text-slate-500">No background jobs found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-semibold text-slate-600">Trigger</th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-600">Status</th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-600">Started</th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-600">Completed</th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-600">Duration</th>
                              <th className="text-left py-2 px-3 font-semibold text-slate-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobStatusData.map((job, jobIndex) => (
                              <tr key={job.id} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-slate-700">
                                  <span className="capitalize">{job.job_payload.triggeredBy}</span>
                                  {job.job_payload.matchId && (
                                    <span className="text-xs text-slate-500 ml-1">
                                      (Match {job.job_payload.matchId})
                                    </span>
                                  )}
                                  {job.retry_count > 0 && (
                                    <span className="text-xs text-orange-600 ml-1">
                                      (Retry {job.retry_count})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${getStatusColor(job.status)}`}>
                                    {(job.status === 'processing' || job.status === 'queued') && (
                                      <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full mr-1"></span>
                                    )}
                                    {job.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-xs">
                                  {job.started_at ? format(new Date(job.started_at), 'HH:mm:ss') : 'N/A'}
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-xs">
                                  {job.completed_at ? format(new Date(job.completed_at), 'HH:mm:ss') : 'N/A'}
                                </td>
                                <td className="py-2 px-3 text-slate-600 text-xs">
                                  {calculateDuration(job.started_at, job.completed_at)}
                                </td>
                                <td className="py-2 px-3">
                                  {shouldShowRetryButton(job, jobIndex) && (
                                    <Button 
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleRetryJob(job.id)}
                                      className="text-xs px-2 py-1"
                                    >
                                      Retry
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </div>
      </AdminLayout>
  );
}

/**
 * Helper function to trigger stats updates with feature flag support
 */
async function triggerStatsUpdate(triggerType: 'match' | 'admin' | 'cron', matchId?: number): Promise<void> {
  const useBackgroundJobs = shouldUseBackgroundJobs(triggerType);
  
  if (useBackgroundJobs) {
    // Use new background job system
    console.log(`🔄 Triggering background job for ${triggerType} stats update`);
    
    const payload = {
      triggeredBy: triggerType === 'match' ? 'post-match' : triggerType,
      matchId,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: 'admin' // For admin-triggered jobs
    };

    const response = await fetch('/api/admin/enqueue-stats-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Background job enqueue failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Background job enqueued for ${triggerType} trigger:`, result.jobId);
  } else {
    // Fallback to original edge function system
    console.log(`🔄 Using fallback edge functions for ${triggerType} stats update`);
    
    const response = await fetch('/api/admin/trigger-stats-update', { 
      method: 'POST' 
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || `Edge function trigger failed: ${response.statusText}`);
      } catch (e) {
        throw new Error(errorText || `Edge function trigger failed: ${response.statusText}`);
      }
    }

    console.log(`✅ Edge functions triggered for ${triggerType} trigger`);
  }
}

export default AdminInfoPage; 