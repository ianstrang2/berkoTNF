'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import Button from '@/components/ui-kit/Button.component';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/apiConfig';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
}

interface TenantMetrics {
  tenant: Tenant;
  stats: {
    matches: {
      total: number;
      upcoming: number;
      lastMatchDate: string | null;
    };
    players: {
      total: number;
      active: number;
      retired: number;
      ringers: number;
    };
  };
  cacheMetadata: Array<{
    cache_key: string;
    last_invalidated: string;
  }>;
  players: Array<{
    player_id: number;
    name: string;
    is_ringer: boolean;
    is_retired: boolean;
    profile_generated_at: string | null;
  }>;
}

interface PlayerRatingData {
  ewmaRatings?: {
    power_rating: number;
    goal_threat: number;
    participation: number;
    power_percentile: number;
    goal_percentile: number;
    participation_percentile: number;
    is_qualified: boolean;
    weighted_played: number;
    half_life_days: number;
  } | null;
}

export default function TenantMetricsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EWMA state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [ratingData, setRatingData] = useState<PlayerRatingData | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);

  // Profile management state
  const [isUpdatingProfiles, setIsUpdatingProfiles] = useState(false);
  const [isResettingProfiles, setIsResettingProfiles] = useState(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const [profileResetSuccess, setProfileResetSuccess] = useState(false);

  // Stats refresh state
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [statsRefreshSuccess, setStatsRefreshSuccess] = useState(false);

  // Fetch tenant list
  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await apiFetch('/superadmin/tenants');
      const result = await response.json();
      if (result.success) {
        setTenants(result.data.map((t: any) => ({
          tenant_id: t.tenant_id,
          name: t.name,
          slug: t.slug
        })));
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  // Fetch metrics for selected tenant
  const fetchMetrics = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/superadmin/tenant-metrics?tenantId=${tenantId}`);
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch metrics');
      }
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch player rating data
  const fetchPlayerRating = useCallback(async (playerId: string) => {
    if (!playerId) return;
    
    setIsLoadingRating(true);
    try {
      const response = await apiFetch(`/admin/rating-data?id=${playerId}`);
      const result = await response.json();
      setRatingData(result.data || null);
    } catch (err) {
      console.error('Error fetching rating:', err);
      setRatingData(null);
    } finally {
      setIsLoadingRating(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchMetrics(selectedTenantId);
    }
  }, [selectedTenantId, fetchMetrics]);

  useEffect(() => {
    if (selectedPlayerId) {
      fetchPlayerRating(selectedPlayerId);
    }
  }, [selectedPlayerId, fetchPlayerRating]);

  const handleUpdateProfiles = async () => {
    if (!selectedTenantId) return;
    
    // Optimistic UI - flash immediately
    setProfileUpdateSuccess(true);
    setTimeout(() => setProfileUpdateSuccess(false), 2000);
    setError(null);
    
    try {
      const response = await apiFetch('/admin/trigger-player-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger profile update');
      }
      
      // Refresh after delay to show progress
      setTimeout(() => fetchMetrics(selectedTenantId), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger profile update');
    }
  };

  const handleResetProfiles = async () => {
    if (!selectedTenantId) return;
    if (!confirm('This will delete ALL existing player profiles for this tenant and regenerate them. Are you sure?')) {
      return;
    }

    // Optimistic UI - flash immediately
    setProfileResetSuccess(true);
    setTimeout(() => setProfileResetSuccess(false), 2000);
    setError(null);
    
    try {
      const response = await apiFetch('/admin/reset-player-profiles', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to reset profiles');
      }
      
      // Refresh after delay to show progress
      setTimeout(() => fetchMetrics(selectedTenantId), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset profiles');
    }
  };

  const handleRefreshStats = async () => {
    if (!selectedTenantId) return;
    
    // Optimistic UI - flash immediately
    setStatsRefreshSuccess(true);
    setTimeout(() => setStatsRefreshSuccess(false), 2000);
    setError(null);
    
    try {
      const response = await apiFetch('/admin/trigger-stats-update', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to trigger stats refresh');
      }
      
      // Refresh after delay to show updated cache timestamps
      setTimeout(() => fetchMetrics(selectedTenantId), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh stats');
    }
  };

  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    return value ? value.toFixed(decimals) : 'N/A';
  };

  return (
    <AdminLayout>
      <div className="w-full px-4">
        <div className="max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Tenant Metrics</h1>
          <p className="text-slate-600 mt-1">View detailed metrics and data for each tenant</p>
        </div>

          {/* Tenant Selector */}
          <div className="mb-6 bg-white p-6 rounded-xl shadow-soft-xl">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Choose a tenant...</option>
              {tenants.map(tenant => (
                <option key={tenant.tenant_id} value={tenant.tenant_id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          )}

          {!selectedTenantId && !isLoading && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-2">📊</div>
              <p>Select a tenant to view detailed metrics and data</p>
            </div>
          )}

          {metrics && !isLoading && (
            <ErrorBoundary>
              <div className="flex flex-wrap -mx-3">
              {/* Activity Overview */}
              <div className="w-full max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Activity Overview</h3>
                  <p className="mb-0 text-sm text-slate-500">{metrics.tenant.name}</p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-800">{metrics.stats.matches.total}</div>
                      <div className="text-xs text-blue-600 uppercase font-semibold">Total Matches</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-800">{metrics.stats.matches.upcoming}</div>
                      <div className="text-xs text-green-600 uppercase font-semibold">Upcoming Matches</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-800">{metrics.stats.players.total}</div>
                      <div className="text-xs text-purple-600 uppercase font-semibold">Total Players</div>
                      <div className="text-xs text-purple-500 mt-1">{metrics.stats.players.active} active (30d)</div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-pink-800">{metrics.stats.players.ringers}</div>
                      <div className="text-xs text-pink-600 uppercase font-semibold">Guests</div>
                      <div className="text-xs text-pink-500 mt-1">{metrics.stats.players.retired} retired</div>
                    </div>
                  </div>
                  {metrics.stats.matches.lastMatchDate && (
                    <div className="mt-4 text-sm text-slate-600">
                      Last Match: {format(new Date(metrics.stats.matches.lastMatchDate), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Stats Cache Status */}
              <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Stats Cache Status</h3>
                  <p className="mb-0 text-sm text-slate-500">Cache timestamps for this tenant</p>
                </div>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-slate-500">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left text-xs font-bold uppercase text-slate-600">Cache Key</th>
                          <th className="p-3 text-left text-xs font-bold uppercase text-slate-600">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.cacheMetadata.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="p-3 text-center text-sm text-slate-400">No cache data available</td>
                          </tr>
                        ) : (
                          metrics.cacheMetadata.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="p-3 text-sm">{item.cache_key}</td>
                              <td className="p-3 text-sm">{format(new Date(item.last_invalidated), 'yyyy-MM-dd HH:mm:ss')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                  <Button 
                    variant={statsRefreshSuccess ? "primary" : "secondary"}
                    className={`rounded-lg shadow-soft-sm ${
                      statsRefreshSuccess ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : ''
                    }`}
                    onClick={handleRefreshStats} 
                    disabled={statsRefreshSuccess}
                  >
                    {statsRefreshSuccess ? 'Queued!' : 'Refresh Stats'}
                  </Button>
                </div>
              </div>
              </div>

              {/* Player Profiles */}
              <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border flex flex-col" style={{ height: '700px' }}>
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Player Profiles</h3>
                  <p className="mb-0 text-sm text-slate-500">Profile generation status</p>
                </div>
                <div className="p-4 flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <table className="w-full border-collapse text-slate-500">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left text-xs font-bold uppercase text-slate-600">Player</th>
                          <th className="p-3 text-center text-xs font-bold uppercase text-slate-600">Retired</th>
                          <th className="p-3 text-center text-xs font-bold uppercase text-slate-600">Guest</th>
                          <th className="p-3 text-left text-xs font-bold uppercase text-slate-600">Profile Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.players.map(player => (
                          <tr key={player.player_id} className="border-b border-gray-100">
                            <td className="p-3 text-sm">{player.name}</td>
                            <td className="p-3 text-sm text-center">{player.is_retired ? 'Yes' : 'No'}</td>
                            <td className="p-3 text-sm text-center">{player.is_ringer ? 'Yes' : 'No'}</td>
                            <td className="p-3 text-sm">
                              {player.profile_generated_at 
                                ? format(new Date(player.profile_generated_at), 'yyyy-MM-dd HH:mm')
                                : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                  <div className="flex gap-2">
                    <Button 
                      variant={profileUpdateSuccess ? "primary" : "secondary"}
                      className={`rounded-lg shadow-soft-sm ${
                        profileUpdateSuccess ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : ''
                      }`}
                      onClick={handleUpdateProfiles} 
                      disabled={profileUpdateSuccess || profileResetSuccess}
                    >
                      {profileUpdateSuccess ? 'Queued!' : 'Update Profiles'}
                    </Button>
                    <Button 
                      variant={profileResetSuccess ? "primary" : "secondary"}
                      className={`rounded-lg shadow-soft-sm ${
                        profileResetSuccess ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : ''
                      }`}
                      onClick={handleResetProfiles}
                      disabled={profileUpdateSuccess || profileResetSuccess}
                    >
                      {profileResetSuccess ? 'Queued!' : 'Reset & Regenerate'}
                    </Button>
                  </div>
                </div>
              </div>
              </div>

              {/* EWMA Performance Ratings */}
              <div className="w-full max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">EWMA Performance Ratings</h3>
                  <p className="mb-0 text-sm text-slate-500">2-year half-life exponentially weighted moving averages</p>
                </div>
                <div className="p-4 border-b border-gray-200">
                  <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Player</label>
                    <select
                      value={selectedPlayerId}
                      onChange={e => setSelectedPlayerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a player...</option>
                      {metrics.players.filter(p => !p.is_retired).map(p => (
                        <option key={p.player_id} value={p.player_id}>
                          {p.name} {p.is_ringer ? '(Guest)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isLoadingRating && (
                  <div className="p-4 flex items-center justify-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status"></div>
                    <span className="ml-2 text-slate-600">Loading player data...</span>
                  </div>
                )}

                {ratingData && !isLoadingRating && ratingData.ewmaRatings ? (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Power Rating</h6>
                        <div className="text-2xl font-bold text-slate-700 mb-1">
                          {formatNumber(ratingData.ewmaRatings.power_rating, 2)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatNumber(ratingData.ewmaRatings.power_percentile, 1)}th percentile
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Goal Threat</h6>
                        <div className="text-2xl font-bold text-slate-700 mb-1">
                          {formatNumber(ratingData.ewmaRatings.goal_threat, 3)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatNumber(ratingData.ewmaRatings.goal_percentile, 1)}th percentile
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h6 className="text-xs font-bold uppercase text-slate-400 mb-2">Participation</h6>
                        <div className="text-2xl font-bold text-slate-700 mb-1">
                          {formatNumber(ratingData.ewmaRatings.participation, 1)}%
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatNumber(ratingData.ewmaRatings.participation_percentile, 1)}th percentile
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 text-sm text-slate-600 bg-white border border-gray-200 rounded-lg p-4">
                      <h6 className="font-semibold mb-3 text-slate-700">EWMA System Details</h6>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium">Weighted games:</span> {formatNumber(ratingData.ewmaRatings.weighted_played, 1)}
                        </div>
                        <div>
                          <span className="font-medium">Qualified:</span> {ratingData.ewmaRatings.is_qualified ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <span className="font-medium">Half-life:</span> {ratingData.ewmaRatings.half_life_days} days
                        </div>
                      </div>
                    </div>
                  </div>
                ) : ratingData && !isLoadingRating ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="text-slate-400 mb-2">📊</div>
                      <p className="text-sm text-slate-400">No EWMA data available for this player</p>
                    </div>
                  </div>
                ) : null}
              </div>
              </div>

              {/* Placeholder: RSVP Metrics */}
              <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border opacity-50">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">RSVP Metrics</h3>
                  <p className="mb-0 text-sm text-slate-500">Coming soon when RSVP goes live</p>
                </div>
                <div className="p-4 text-center text-slate-400">
                  <div className="text-4xl mb-2">📱</div>
                  <p className="text-sm">Response rates, fill rates, and waitlist metrics will appear here</p>
                </div>
              </div>
              </div>

              {/* Placeholder: Billing Metrics */}
              <div className="w-full lg:w-1/2 max-w-full px-3 mb-6 flex-none">
              <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border opacity-50">
                <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
                  <h3 className="mb-0 text-lg font-semibold text-slate-700">Billing Metrics</h3>
                  <p className="mb-0 text-sm text-slate-500">Coming soon when billing goes live</p>
                </div>
                <div className="p-4 text-center text-slate-400">
                  <div className="text-4xl mb-2">💰</div>
                  <p className="text-sm">Outstanding balance, payment rates, and billing history will appear here</p>
                </div>
              </div>
              </div>
              </div>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
