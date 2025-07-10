'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, nextThursday } from 'date-fns';
import { Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout.layout';
import MatchModal from '@/components/team/modals/MatchModal.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import Button from '@/components/ui-kit/Button.component';

interface ActiveMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    players: number;
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
  const searchParams = useSearchParams() || new URLSearchParams();
  const view = searchParams.get('view') || 'active';
  const router = useRouter();

  const [active, setActive] = useState<ActiveMatch[]>([]);
  const [history, setHistory] = useState<HistoricalMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New match modal state
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<ActiveMatch | HistoricalMatch | null>(null);

  // New match data state
  const [newMatchData, setNewMatchData] = useState({
    date: format(nextThursday(new Date()), 'yyyy-MM-dd'),
    team_size: 9,
    match_date: format(nextThursday(new Date()), 'yyyy-MM-dd')
  });

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
          return `Delete this match on ${dateStr}? ${activeMatch._count.players} players will be removed from the pool.`;
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

    setIsDeleting(true);
    
    try {
      const endpoint = getDeleteEndpoint(matchToDelete);
      const response = await fetch(endpoint, { method: 'DELETE' });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete match');
      }

      // Refresh the matches list
      const fetchData = async () => {
        try {
          const [activeRes, historyRes] = await Promise.all([
            fetch('/api/admin/upcoming-matches', { cache: 'no-store' }),
            fetch('/api/matches/history', { cache: 'no-store' })
          ]);

          if (activeRes.ok && historyRes.ok) {
            const activeData = await activeRes.json();
            const historyData = await historyRes.json();
            setActive(activeData.data?.filter((m: ActiveMatch) => m.state !== 'Completed') || []);
            setHistory(historyData.data || []);
          }
        } catch (err) {
          console.error('Failed to refresh matches:', err);
        }
      };
      await fetchData();
      
      // Close modal
      setIsDeleteModalOpen(false);
      setMatchToDelete(null);
      
    } catch (err: any) {
      console.error('Delete failed:', err);
      // You could add a toast notification here for the error
    } finally {
      setIsDeleting(false);
    }
  };

  // Create match handler - stays on matches list instead of redirecting
  const handleCreateMatch = async () => {
    setIsCreating(true);
    setCreateError(null);
    
    try {
      const response = await fetch('/api/admin/upcoming-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_date: newMatchData.date,
          team_size: newMatchData.team_size
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create match');
      }

      // Close modal and refresh the matches list
      setIsNewMatchModalOpen(false);
      
      // Reset form data for next use
      setNewMatchData({
        date: format(nextThursday(new Date()), 'yyyy-MM-dd'),
        team_size: 9,
        match_date: format(nextThursday(new Date()), 'yyyy-MM-dd')
      });
      
      // Refresh the matches list
      const fetchData = async () => {
        try {
          const activeRes = await fetch('/api/admin/upcoming-matches', { cache: 'no-store' });
          if (activeRes.ok) {
            const activeData = await activeRes.json();
            // Show all non-completed matches regardless of date
            setActive(activeData.data?.filter((m: ActiveMatch) => m.state !== 'Completed') || []);
          }
        } catch (err) {
          console.error('Failed to refresh matches:', err);
        }
      };
      fetchData();
      
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [activeRes, historyRes] = await Promise.all([
          fetch('/api/admin/upcoming-matches', { cache: 'no-store' }),
          fetch('/api/matches/history', { cache: 'no-store' })
        ]);

        if (!activeRes.ok || !historyRes.ok) {
          throw new Error('Failed to fetch match data');
        }

        const activeData = await activeRes.json();
        const historyData = await historyRes.json();

        // Show all non-completed matches regardless of date
        setActive(activeData.data?.filter((m: ActiveMatch) => m.state !== 'Completed') || []);
        setHistory(historyData.data || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
              <p className="text-sm text-slate-500">Players in pool: {match._count.players}</p>
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
      
      {/* Mobile FAB for creating matches - only show on active view */}
      {view === 'active' && (
        <Button 
          onClick={() => setIsNewMatchModalOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 rounded-full w-14 h-14 bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center"
        >
          <span className="text-xl font-bold">+</span>
        </Button>
      )}
      
      {/* New Match Modal */}
      <MatchModal 
        isOpen={isNewMatchModalOpen}
        onClose={() => setIsNewMatchModalOpen(false)}
        data={newMatchData}
        onChange={(field, value) => setNewMatchData(prev => ({ ...prev, [field]: value }))}
        onSubmit={handleCreateMatch}
        isLoading={isCreating}
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
        confirmText={isDeleting ? 'Deleting...' : 'Delete Match'}
        cancelText="Cancel"
        isConfirming={isDeleting}
        icon="warning"
      />
    </div>
  );
};

const MatchListPage = () => (
  <MainLayout>
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <MatchListPageContent />
    </Suspense>
  </MainLayout>
);

export default MatchListPage; 