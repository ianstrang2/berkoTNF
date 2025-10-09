'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import Button from '@/components/ui-kit/Button.component';

import { format } from 'date-fns';
import { shouldUseBackgroundJobs } from '@/config/feature-flags';


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
  results?: {
    total_functions?: number;
    successful_functions?: number;
    failed_functions?: number;
    function_results?: Array<{
      function: string;
      status: string;
      duration: number;
      error?: string;
    }>;
  } | null;
  created_at: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_slug?: string | null;
}

interface SystemHealthData {
  platform: {
    totalTenants: number;
    activeTenants: number;
    activityBreakdown: {
      active: number;
      recent: number;
      inactive: number;
    };
    totalPlayers: number;
    totalMatches: number;
  };
  systemHealth: {
    database: {
      status: string;
      responseTimeMs: number;
    };
    worker: {
      status: string;
      stuckJobs: number;
    };
    cache: {
      status: string;
      lastUpdated: string | null;
    };
  };
  backgroundJobs: {
    total: number;
    completed: number;
    failed: number;
    queued: number;
    processing: number;
  };
  jobSuccessRate: number;
}

export default function SystemHealthPage() {
  const [systemHealthData, setSystemHealthData] = useState<SystemHealthData | null>(null);
  
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [isUpdatingStats, setIsUpdatingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

  // Background Job Status state
  const [jobStatusData, setJobStatusData] = useState<BackgroundJobStatus[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');


  const fetchSystemHealth = useCallback(async () => {
    setIsLoadingHealth(true);
    try {
      const response = await fetch('/api/superadmin/system-health');
      const result = await response.json();

      if (result.success) {
        setSystemHealthData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch system health');
      }
    } catch (err: any) {
      console.error('Error fetching system health:', err);
      setError(err.message);
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  const fetchJobStatus = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobError(null);
    try {
      const response = await fetch('/api/superadmin/background-jobs');
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
      setJobStatusData(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'queued' as const } 
          : job
      ));

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
      
      await fetchJobStatus();
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      
    } catch (err: any) {
      console.error(`Failed to retry job: ${err.message}`);
      setError(`Failed to retry job: ${err.message}`);
      
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

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
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

  const hasRecentJobs = jobStatusData.some(job => 
    new Date(job.created_at) > new Date(Date.now() - 10 * 60 * 1000)
  );

  const hasStuckJobs = jobStatusData.some(job => 
    job.status === 'queued' && 
    new Date(job.created_at) < new Date(Date.now() - 5 * 60 * 1000)
  );

  const isBackgroundJobsEnabled = shouldUseBackgroundJobs('admin');

  const shouldShowRetryButton = (job: BackgroundJobStatus, jobIndex: number) => {
    if (job.status !== 'failed') return false;
    
    const mostRecentSuccessfulJob = jobStatusData.find(j => j.status === 'completed');
    
    if (mostRecentSuccessfulJob && 
        new Date(mostRecentSuccessfulJob.created_at) > new Date(job.created_at)) {
      return false;
    }
    
    const mostRecentFailedJobIndex = jobStatusData.findIndex(j => j.status === 'failed');
    return jobIndex === mostRecentFailedJobIndex;
  };

  // Get unique tenants from job data for filter
  const uniqueTenantMap = new Map<string, string>();
  let hasSystemJobs = false;
  
  jobStatusData.forEach(job => {
    if (job.tenant_id && job.tenant_name) {
      uniqueTenantMap.set(job.tenant_id, job.tenant_name);
    } else if (!job.tenant_id) {
      hasSystemJobs = true;
    }
  });
  
  const uniqueTenants = Array.from(uniqueTenantMap.entries()).map(([id, name]) => ({
    id,
    name
  }));

  const filteredJobs = selectedTenantFilter === 'all' 
    ? jobStatusData 
    : selectedTenantFilter === 'system'
    ? jobStatusData.filter(j => !j.tenant_id)
    : jobStatusData.filter(j => j.tenant_id === selectedTenantFilter);

  useEffect(() => {
    fetchSystemHealth();
    fetchJobStatus();
  }, []);

  useEffect(() => {
    const hasActiveJobs = jobStatusData.some(job => 
      job.status === 'queued' || job.status === 'processing'
    );
    
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      fetchJobStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [jobStatusData]);

  const handleUpdateStats = async () => {
    setIsUpdatingStats(true);
    setError(null);
    
    try {
      // Superadmin triggers stats for ALL tenants via dedicated endpoint
      const response = await fetch('/api/superadmin/trigger-all-stats', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to trigger stats update');
      }

      const result = await response.json();
      console.log('Stats update result:', result);
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      
      await Promise.all([
        fetchJobStatus(),
        fetchSystemHealth()
      ]);
      
    } catch (err: any) {
      console.error('Error triggering stats update:', err);
      setError(err.message || 'Failed to trigger stats update.');
    } finally {
      setIsUpdatingStats(false);
    }
  };

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
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap font-sans">{error}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <ErrorBoundary>
          <div className="flex flex-wrap -mx-3 max-w-7xl">
            {/* Platform Stats Summary */}
            {systemHealthData && (
              <div className="w-full max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Platform Overview</h3>
                  <p className="mb-0 text-sm text-slate-500">System-wide statistics across all tenants</p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-800">{systemHealthData.platform.totalTenants}</div>
                      <div className="text-xs text-blue-600 uppercase font-semibold">Total Tenants</div>
                      <div className="text-xs text-blue-500 mt-1">
                        {systemHealthData.platform.activeTenants} active
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-800">{systemHealthData.platform.activityBreakdown.active}</div>
                      <div className="text-xs text-green-600 uppercase font-semibold">Active (7d)</div>
                      <div className="text-xs text-green-500 mt-1">Last 7 days</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-800">{systemHealthData.platform.activityBreakdown.recent}</div>
                      <div className="text-xs text-yellow-600 uppercase font-semibold">Recent (30d)</div>
                      <div className="text-xs text-yellow-500 mt-1">Last 30 days</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-800">{systemHealthData.platform.totalPlayers}</div>
                      <div className="text-xs text-purple-600 uppercase font-semibold">Total Players</div>
                      <div className="text-xs text-purple-500 mt-1">All tenants</div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-pink-800">{systemHealthData.platform.totalMatches}</div>
                      <div className="text-xs text-pink-600 uppercase font-semibold">Total Matches</div>
                      <div className="text-xs text-pink-500 mt-1">All time</div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* System Health Cards */}
            {systemHealthData && (
              <div className="w-full max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">System Health</h3>
                  <p className="mb-0 text-sm text-slate-500">Service status and performance metrics</p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-700">Database</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealthData.systemHealth.database.status)}`}>
                          {systemHealthData.systemHealth.database.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Response: {systemHealthData.systemHealth.database.responseTimeMs}ms
                      </div>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-700">Worker</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealthData.systemHealth.worker.status)}`}>
                          {systemHealthData.systemHealth.worker.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {systemHealthData.systemHealth.worker.stuckJobs > 0 ? (
                          <span className="text-yellow-600">{systemHealthData.systemHealth.worker.stuckJobs} stuck jobs</span>
                        ) : (
                          'No stuck jobs'
                        )}
                      </div>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-700">Cache</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealthData.systemHealth.cache.status)}`}>
                          {systemHealthData.systemHealth.cache.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {systemHealthData.systemHealth.cache.lastUpdated 
                          ? `Updated: ${format(new Date(systemHealthData.systemHealth.cache.lastUpdated), 'MMM d, HH:mm')}`
                          : 'No updates'}
                      </div>
                    </div>
                  </div>

                  {/* Background Jobs Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm font-semibold text-slate-700 mb-3">Background Jobs (Last 24h)</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-700">{systemHealthData.backgroundJobs.total}</div>
                        <div className="text-xs text-slate-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{systemHealthData.backgroundJobs.completed}</div>
                        <div className="text-xs text-slate-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{systemHealthData.backgroundJobs.failed}</div>
                        <div className="text-xs text-slate-500">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{systemHealthData.backgroundJobs.queued}</div>
                        <div className="text-xs text-slate-500">Queued</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{systemHealthData.jobSuccessRate}%</div>
                        <div className="text-xs text-slate-500">Success Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* Processing Mode Indicator */}
            <div className="w-full max-w-full px-3 mb-6 flex-none">
            <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
              <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                <h3 className="mb-0 text-lg font-semibold text-slate-700">Stats Processing Mode</h3>
                <p className="mb-0 text-sm text-slate-500">How stats updates are being processed</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-3 rounded-lg ${isBackgroundJobsEnabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <div className="flex items-center gap-2">
                      {isBackgroundJobsEnabled ? (
                        <>
                          <span className="text-2xl">⚙️</span>
                          <div>
                            <div className="font-semibold text-green-800">Background Worker</div>
                            <div className="text-xs text-green-600">Render worker processing stats updates</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">⚡</span>
                          <div>
                            <div className="font-semibold text-yellow-800">Edge Functions (Fallback)</div>
                            <div className="text-xs text-yellow-600">Using Supabase Edge Functions (slower)</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Button 
                      variant={updateSuccess ? "primary" : "secondary"}
                      className={`rounded-lg shadow-soft-sm ${
                        updateSuccess ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : ''
                      }`}
                      onClick={handleUpdateStats} 
                      disabled={isUpdatingStats}
                    >
                      {isUpdatingStats ? 'Updating All Tenants...' : updateSuccess ? 'Updated!' : 'Update All Tenants Stats'}
                    </Button>
                    <div className="text-xs text-slate-500 mt-1">
                      Triggers stats update for all tenants in the platform
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Background Job Status Table */}
            <ErrorBoundary>
              <div className="w-full max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border flex flex-col" style={{ maxHeight: '600px' }}>
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="mb-0 text-lg font-semibold text-slate-700">Background Job Status</h3>
                      <p className="mb-0 text-sm text-slate-500">
                        Last 25 jobs across all tenants
                        {filteredJobs.some(job => job.status === 'queued' || job.status === 'processing') && (
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
                <div className="p-4 flex-1 overflow-y-auto min-h-0">
                  {/* Tenant Filter */}
                  {(uniqueTenants.length > 0 || hasSystemJobs) && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Tenant</label>
                      <select
                        value={selectedTenantFilter}
                        onChange={(e) => setSelectedTenantFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Tenants ({jobStatusData.length})</option>
                        {hasSystemJobs && (
                          <option value="system">System Jobs ({jobStatusData.filter(j => !j.tenant_id).length})</option>
                        )}
                        {uniqueTenants.map(tenant => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name} ({jobStatusData.filter(j => j.tenant_id === tenant.id).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isLoadingJobs ? (
                    <p className="text-center text-sm text-slate-500">Loading job status...</p>
                  ) : jobError ? (
                    <p className="text-center text-sm text-red-500">Error loading jobs: {jobError}</p>
                  ) : filteredJobs.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No background jobs found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Tenant</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Trigger</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Status</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Duration</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Created</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Error/Details</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredJobs.map((job, jobIndex) => (
                            <tr key={job.id} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-slate-700 text-xs">
                                {job.tenant_name || job.tenant_slug || <span className="text-slate-400">System</span>}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                <div className="flex items-center gap-2">
                                  <span className="capitalize">{job.job_payload.triggeredBy}</span>
                                  {job.job_type === 'stats_update_fallback' && (
                                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium" title="Using edge functions (fallback mode)">
                                      ⚡ Fallback
                                    </span>
                                  )}
                                </div>
                                {job.job_payload.matchId && (
                                  <span className="text-xs text-slate-500">
                                    Match {job.job_payload.matchId}
                                  </span>
                                )}
                                {job.retry_count > 0 && (
                                  <span className="text-xs text-orange-600">
                                    Retry {job.retry_count}
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
                              <td className="py-2 px-3 text-slate-600 text-xs font-semibold">
                                {calculateDuration(job.started_at, job.completed_at)}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-xs">
                                {job.created_at ? format(new Date(job.created_at), 'MMM d HH:mm:ss') : 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-xs max-w-md">
                                {job.results?.function_results ? (
                                  <details className="cursor-pointer">
                                    <summary className={job.status === 'failed' ? 'text-red-600 hover:text-red-800 font-medium' : 'text-green-600 hover:text-green-800'}>
                                      {job.results.successful_functions}/{job.results.total_functions} functions succeeded
                                      {(job.results.failed_functions ?? 0) > 0 && ` • ${job.results.failed_functions} failed`}
                                    </summary>
                                    <div className="mt-2 p-3 bg-slate-50 rounded text-xs space-y-1 max-h-64 overflow-y-auto">
                                      {job.results.function_results.map((result: any, idx: number) => (
                                        <div key={idx} className={`flex items-start gap-2 ${result.status === 'failed' ? 'text-red-600' : 'text-green-600'}`}>
                                          <span className="font-mono font-semibold">{result.status === 'success' ? '✓' : '✗'}</span>
                                          <div className="flex-1">
                                            <div className="font-medium">{result.function}</div>
                                            <div className="text-slate-500">
                                              {result.duration}ms
                                              {result.error && <span className="text-red-600 ml-2">• {result.error}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                ) : job.error_message ? (
                                  <details className="cursor-pointer">
                                    <summary className="text-red-600 hover:text-red-800">
                                      {job.error_message.substring(0, 50)}...
                                    </summary>
                                    <div className="mt-2 p-2 bg-red-50 rounded text-xs font-mono whitespace-pre-wrap">
                                      {job.error_message}
                                    </div>
                                  </details>
                                ) : job.status === 'completed' ? (
                                  <span className="text-green-600">✓ Completed</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
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
              </div>
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </div>
      </AdminLayout>
    );
  }

async function triggerStatsUpdate(triggerType: 'match' | 'admin' | 'cron', matchId?: number): Promise<void> {
  const useBackgroundJobs = shouldUseBackgroundJobs(triggerType);
  
  if (useBackgroundJobs) {
    const payload = {
      triggeredBy: triggerType === 'match' ? 'post-match' : triggerType,
      matchId,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: 'admin'
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
  } else {
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
  }
}
