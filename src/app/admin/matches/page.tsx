'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, nextThursday } from 'date-fns';
import { Trash2 } from 'lucide-react';
import MatchModal from '@/components/team/modals/MatchModal.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import Button from '@/components/ui-kit/Button.component';
// React Query hooks for automatic deduplication
import { useUpcomingMatchesList, useCreateMatch, useDeleteMatch } from '@/hooks/queries/useUpcomingMatchesList.hook';
import { useMatchHistory } from '@/hooks/queries/useMatchHistory.hook';
import { useAuth } from '@/hooks/useAuth.hook';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useEffect } from 'react';

interface ActiveMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    upcoming_match_players: number;
  };
}

interface HistoricalMatch {
  match_id: number;
  upcoming_match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
}

const MatchListPageContent = () => {
  // ALL HOOKS MUST BE AT THE TOP (React rules!)
  const searchParams = useSearchParams() || new URLSearchParams();
  const view = searchParams.get('view') || 'active';
  const router = useRouter();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: active = [], isLoading: activeLoading, error: activeError, refetch: refetchActive } = useUpcomingMatchesList();
  const { data: history = [], isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useMatchHistory();
  const createMatchMutation = useCreateMatch();
  const deleteMatchMutation = useDeleteMatch();
  
  // All useState hooks BEFORE any conditional returns
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<ActiveMatch | HistoricalMatch | null>(null);
  const [newMatchData, setNewMatchData] = useState({
    date: format(nextThursday(new Date()), 'yyyy-MM-dd'),
    team_size: 9,
    match_date: format(nextThursday(new Date()), 'yyyy-MM-dd')
  });
  
  // Force refetch when tenantId becomes available (fixes cache race condition)
  useEffect(() => {
    if (profile.tenantId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingMatchesList(profile.tenantId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matchHistory(profile.tenantId) });
    }
  }, [profile.tenantId, queryClient]);
  
  // Derive state after all hooks
  const isLoading = activeLoading || historyLoading;
  const error = activeError ? (activeError as Error).message : 
                historyError ? (historyError as Error).message : null;
  
  // NOW we can have conditional returns (after ALL hooks)
  if (!profile.tenantId && profile.isAuthenticated) {
    return <div className="p-4 text-center">Loading tenant context...</div>;
  }

  // Helper function to format state display text
  const formatStateDisplay = (state: string) => {
    switch (state) {
      case 'PoolLocked':
      case 'POOLLOCKED':
        return 'POOL LOCKED';
      case 'TeamsBalanced':
      case 'TEAMSBALANCED':
        return 'TEAMS BALANCED';
      default:
        return state.toUpperCase();
    }
  };

  // Delete functionality
  const handleDeleteClick = (match: ActiveMatch | HistoricalMatch) => {
    setMatchToDelete(match);
    setIsDeleteModalOpen(true);
  };

  const getDeleteEndpoint = (match: ActiveMatch | HistoricalMatch) => {
    if ('_count' in match) {
      // Active match
      return `/api/admin/upcoming-matches?id=${match.upcoming_match_id}`;
    } else {
      // Historical match
      return `/api/matches/history?matchId=${match.match_id}`;
    }
  };

  const getDeleteMessage = (match: ActiveMatch | HistoricalMatch) => {
    if ('_count' in match) {
      // Active match
      const activeMatch = match as ActiveMatch;
      const dateStr = format(new Date(activeMatch.match_date), 'EEEE, MMMM d, yyyy');
      
      switch (activeMatch.state) {
        case 'Draft':
          return `Delete this match on ${dateStr}?`;
        case 'PoolLocked':
          return `Delete this match on ${dateStr}? ${activeMatch._count.upcoming_match_players} players will be removed from the pool.`;
        case 'TeamsBalanced':
          return `Delete this match on ${dateStr}? Teams have been balanced and will be lost.`;
        case 'Completed':
          return `⚠️ Delete completed match on ${dateStr}? This will permanently remove results and may affect player statistics.`;
        default:
          return `Delete this match on ${dateStr}?`;
      }
    } else {
      // Historical match
      const histMatch = match as HistoricalMatch;
      const dateStr = format(new Date(histMatch.match_date), 'EEEE, MMMM d, yyyy');
      return `⚠️ Delete completed match on ${dateStr}? Score: ${histMatch.team_a_score}-${histMatch.team_b_score}. This will permanently remove results and may affect player statistics.`;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!matchToDelete) return;
    
    try {
      const isHistorical = !('_count' in matchToDelete);
      const matchId = isHistorical 
        ? (matchToDelete as HistoricalMatch).match_id 
        : (matchToDelete as ActiveMatch).upcoming_match_id;
      
      await deleteMatchMutation.mutateAsync({ 
        matchId, 
        isHistorical 
      });
      
      // Close modal on success (mutation automatically refetches lists)
      setIsDeleteModalOpen(false);
      setMatchToDelete(null);
      
    } catch (err: any) {
      console.error('Delete failed:', err);
      // Error is handled by the mutation
    }
  };

  // Create match handler - uses React Query mutation
  const handleCreateMatch = async () => {
    setCreateError(null);
    
    try {
      await createMatchMutation.mutateAsync({
        match_date: newMatchData.date,
        team_size: newMatchData.team_size
      });

      // Close modal and reset form on success (mutation automatically refetches list)
      setIsNewMatchModalOpen(false);
      setNewMatchData({
        date: format(nextThursday(new Date()), 'yyyy-MM-dd'),
        team_size: 9,
        match_date: format(nextThursday(new Date()), 'yyyy-MM-dd')
      });
      
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  const renderActiveList = () => (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800">Active Matches</h2>
      </div>
      
      {/* Existing match list */}
      {active.map(match => (
        <div key={match.upcoming_match_id} className="relative block bg-white hover:shadow-lg transition-shadow duration-300 p-4 rounded-xl shadow-soft-xl border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-slate-500">Players in pool: {match._count.upcoming_match_players}</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-xs font-medium uppercase py-1 px-3 rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-soft-sm">{formatStateDisplay(match.state)}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteClick(match);
                }}
                className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center hover:scale-105 transition-transform"
                title="Delete match"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          
          {/* Make the entire card clickable for navigation */}
          <Link href={`/admin/matches/${match.upcoming_match_id}`} className="absolute inset-0 z-0" />
        </div>
      ))}
      
      {/* Create New Match Card */}
      <div 
        onClick={() => setIsNewMatchModalOpen(true)}
        className="block bg-white hover:shadow-lg transition-shadow duration-300 p-4 rounded-xl shadow-soft-xl border cursor-pointer hover:bg-gray-50"
      >
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-slate-700">Create New Match</p>
            <p className="text-sm text-slate-400">Add a new match to the schedule</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center">
            <span className="text-lg font-bold">+</span>
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderHistoryList = () => (
    <div className="space-y-4 max-w-3xl">
      {history.map(match => {
        return (
          <div key={match.match_id} className="relative block bg-white hover:shadow-lg transition-shadow duration-300 p-4 rounded-xl shadow-soft-xl border">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-slate-500 font-bold">{match.team_a_score} - {match.team_b_score}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteClick(match);
                }}
                className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center hover:scale-105 transition-transform"
                title="Delete match"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            {/* Make all matches clickable for navigation */}
            <Link href={`/admin/matches/${match.upcoming_match_id}`} className="absolute inset-0 z-0" />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col w-full">
      {isLoading && <p>Loading matches...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && (
        <div>
          {view === 'active' ? renderActiveList() : renderHistoryList()}
        </div>
      )}

      
      {/* New Match Modal */}
      <MatchModal 
        isOpen={isNewMatchModalOpen}
        onClose={() => setIsNewMatchModalOpen(false)}
        data={newMatchData}
        onChange={(field, value) => setNewMatchData(prev => ({ ...prev, [field]: value }))}
        onSubmit={handleCreateMatch}
        isLoading={createMatchMutation.isPending}
        error={createError}
        isEditing={false}
      />

      {/* Delete Confirmation Modal */}
      <SoftUIConfirmationModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setMatchToDelete(null);
        }}
        title="Delete Match"
        message={matchToDelete ? getDeleteMessage(matchToDelete) : ''}
        confirmText={deleteMatchMutation.isPending ? 'Deleting...' : 'Delete Match'}
        cancelText="Cancel"
        isConfirming={deleteMatchMutation.isPending}
        icon="warning"
      />
    </div>
  );
};

const MatchListPage = () => (
  <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
    <MatchListPageContent />
  </Suspense>
);

export default MatchListPage; 