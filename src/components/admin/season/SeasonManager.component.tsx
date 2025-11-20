'use client';
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import SeasonFormModal from './SeasonFormModal.component';
import SeasonDeleteModal from './SeasonDeleteModal.component';
import OrphanedMatchesTable from './OrphanedMatchesTable.component';
import { shouldUseBackgroundJobs } from '@/config/feature-flags';
import { Season, SeasonFormData, SeasonsListResponse, CurrentSeasonResponse } from '@/types/season.types';
// React Query hooks for automatic deduplication
import { useSeasons } from '@/hooks/queries/useSeasons.hook';
import { useCurrentSeason } from '@/hooks/queries/useCurrentSeason.hook';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth.hook';
import { apiFetch } from '@/lib/apiConfig';

const SeasonManager: React.FC = () => {
  // ALL HOOKS MUST BE AT THE TOP (React rules!)
  const { profile } = useAuth();
  const { data: seasons = [], isLoading: seasonsLoading, error: seasonsError, refetch: refetchSeasons } = useSeasons();
  const { data: currentSeason = null, isLoading: currentLoading, refetch: refetchCurrent } = useCurrentSeason();
  const queryClient = useQueryClient();
  
  // UI state hooks - must be BEFORE any conditional returns
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string>('');
  
  // Force refetch when tenantId becomes available (fixes cache race condition)
  useEffect(() => {
    if (profile.tenantId) {
      console.log('[SeasonManager] TenantId available, invalidating stale cache:', profile.tenantId);
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons(profile.tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentSeason(profile.tenantId) });
    }
  }, [profile.tenantId, queryClient]);
  
  // Derive state after all hooks
  const tenantId = profile.tenantId;
  const loading = seasonsLoading || currentLoading;
  const error = seasonsError ? (seasonsError as Error).message : '';
  
  // NOW we can have conditional returns (after ALL hooks)
  if (loading || !profile.tenantId) {
    return (
      <div className="flex flex-wrap -mx-3">
        <div className="w-full max-w-full px-3 flex-none">
          <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
            <div className="text-center">
              <h6 className="mb-2 text-lg">Loading seasons...</h6>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmitSeason = async (formData: SeasonFormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      const url = selectedSeason ? `/api/seasons/${selectedSeason.id}` : '/api/seasons';
      const method = selectedSeason ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowSeasonModal(false);
        setSelectedSeason(null);
        
        // React Query refetch - automatic cache invalidation
        await refetchSeasons();
        await refetchCurrent();
        queryClient.invalidateQueries({ queryKey: queryKeys.orphanedMatches(tenantId) });
        
        // Trigger orphaned matches refresh since season dates changed
        window.dispatchEvent(new CustomEvent('refreshOrphanedMatches'));
        
        // Trigger stats refresh since season boundaries changed
        try {
          await triggerStatsUpdate('admin');
          console.log('✅ Stats update triggered after season change');
        } catch (statsError) {
          console.warn('⚠️ Failed to trigger stats update after season change:', statsError);
          // Don't show error to user - stats refresh is secondary to season edit
        }
      } else {
        setFormError(data.error || 'Failed to save season');
      }
    } catch (err) {
      setFormError('Failed to save season');
      console.error('Error saving season:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeason = (season: Season) => {
    setSeasonToDelete(season);
    setShowDeleteModal(true);
  };

  const confirmDeleteSeason = async () => {
    if (!seasonToDelete) return;

    setIsDeleting(true);
    setFormError('');

    try {
      const response = await apiFetch(`/seasons/${seasonToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        setSeasonToDelete(null);
        
        // React Query refetch - automatic cache invalidation
        await refetchSeasons();
        await refetchCurrent();
        queryClient.invalidateQueries({ queryKey: queryKeys.orphanedMatches(tenantId) });
        
        // Trigger orphaned matches refresh since season was deleted
        window.dispatchEvent(new CustomEvent('refreshOrphanedMatches'));
        
        // Trigger stats refresh since season boundaries changed
        try {
          await triggerStatsUpdate('admin');
          console.log('✅ Stats update triggered after season deletion');
        } catch (statsError) {
          console.warn('⚠️ Failed to trigger stats update after season deletion:', statsError);
        }
      } else {
        setFormError(data.error || 'Failed to delete season');
      }
    } catch (err) {
      setFormError('Failed to delete season');
      console.error('Error deleting season:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSeason = (season: Season) => {
    setSelectedSeason(season);
    setShowSeasonModal(true);
  };

  const handleCreateSeason = () => {
    setSelectedSeason(null);
    setShowSeasonModal(true);
  };

  // Stats update trigger function (copied from admin/info)
  const triggerStatsUpdate = async (triggerType: 'match' | 'admin' | 'cron', matchId?: number): Promise<void> => {
    const useBackgroundJobs = shouldUseBackgroundJobs(triggerType);
    
    if (useBackgroundJobs) {
      // Use new background job system
      console.log(`🔄 Triggering background job for ${triggerType} stats update (season change)`);
      
      const payload = {
        triggeredBy: triggerType === 'match' ? 'post-match' : triggerType,
        matchId,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: 'admin',
        reason: 'season-change' // Add context for season changes
      };

      const response = await apiFetch('/admin/enqueue-stats-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Background job enqueue failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Background job enqueued for season change:`, result.jobId);
    } else {
      // Fallback to original edge function system
      console.log(`🔄 Using fallback edge functions for season change stats update`);
      
      const response = await apiFetch('/admin/trigger-stats-update', { 
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

      console.log(`✅ Edge functions triggered for season change`);
    }
  };

  return (
    <div className="w-full px-4">
      <ErrorBoundary>
        <div className="flex flex-wrap gap-6">
          {/* Error message */}
          {error && (
            <div className="w-full mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* No current season warning */}
        {!currentSeason && (
          <div className="w-full mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <p className="text-yellow-800 font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              No Current Season
            </p>
            <p className="text-yellow-600 text-sm mt-1">
              Create a season that includes today's date to enable match creation.
              </p>
            </div>
          )}

          {/* Seasons Table Card */}
          <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
            <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
              <div className="flex items-center justify-between">
                <h5 className="mb-0 text-lg font-semibold text-slate-700">Season Manager</h5>
                <button
                  onClick={handleCreateSeason}
                  disabled={!!currentSeason}
                  className={`inline-block px-4 py-2 mb-0 text-xs font-medium text-center uppercase align-middle transition-all border-0 rounded-lg cursor-pointer leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 ${
                    currentSeason 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50' 
                      : 'text-white bg-gradient-to-tl from-purple-700 to-pink-500 hover:scale-102 active:opacity-85'
                  }`}
                  title={currentSeason ? 'Cannot create new season while one is active' : 'Create new season'}
                >
                  Create New
                </button>
              </div>
            </div>
            <div className="p-4">
              {seasons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">No seasons found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
                    <thead className="align-bottom">
                      <tr>
                        <th className="px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                          Season
                        </th>
                        <th className="px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                          Dates
                        </th>
                        <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" title="Season status">
                          ●
                        </th>
                        <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasons.map((season) => {
                        const today = new Date();
                        const startDate = new Date(season.startDate);
                        const endDate = new Date(season.endDate);
                        const isCurrent = today >= startDate && today <= endDate;
                        const isPast = today > endDate;
                        const isFuture = today < startDate;

                        return (
                          <tr key={season.id}>
                            <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                              <div className="flex px-2 py-1">
                                <div className="flex flex-col justify-center">
                                  <h6 className="mb-0 text-sm leading-normal font-semibold">
                                    {season.displayName}
                                  </h6>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                              <div className="text-xs text-slate-500">
                                <div>{new Date(season.startDate).toLocaleDateString()}</div>
                                <div>to {new Date(season.endDate).toLocaleDateString()}</div>
                              </div>
                            </td>
                            <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap shadow-transparent" title={isCurrent ? 'Current season' : isPast ? 'Past season' : 'Future season'}>
                              <span className={`text-lg ${
                                isCurrent 
                                  ? 'text-green-500' 
                                  : isPast 
                                    ? 'text-gray-300'
                                    : 'text-blue-500'
                              }`}>
                                ●
                              </span>
                            </td>
                            <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEditSeason(season)}
                                  className="inline-block px-3 py-1 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                                  title="Edit season"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSeason(season)}
                                  className="inline-block px-2 py-1 text-xs font-medium text-center text-white align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-red-600 to-rose-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                                  title="Delete season"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Orphaned Matches Card */}
          <OrphanedMatchesTable />
        </div>
      </ErrorBoundary>

      {/* Season Form Modal */}
      <SeasonFormModal 
        isOpen={showSeasonModal}
        onClose={() => {
          setShowSeasonModal(false);
          setSelectedSeason(null);
          setFormError('');
        }}
        onSubmit={handleSubmitSeason}
        isProcessing={isSubmitting}
        initialData={selectedSeason}
        title={selectedSeason ? "Edit Season" : "Create New Season"}
        submitButtonText={selectedSeason ? "Save Changes" : "Create Season"}
      />

      {/* Season Delete Modal */}
      <SeasonDeleteModal 
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSeasonToDelete(null);
          setFormError('');
        }}
        onConfirm={confirmDeleteSeason}
        isProcessing={isDeleting}
        season={seasonToDelete}
      />
    </div>
  );
};

export default SeasonManager;
