'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, nextThursday } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout.layout';
import MatchModal from '@/components/team/modals/MatchModal.component';
import Button from '@/components/ui-kit/Button.component';

interface UpcomingMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    players: number;
  };
}

interface HistoricalMatch {
  match_id: number;
  upcoming_match_id: number | null;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
}

const MatchListPageContent = () => {
  const searchParams = useSearchParams() || new URLSearchParams();
  const view = searchParams.get('view') || 'upcoming';
  const router = useRouter();

  const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
  const [history, setHistory] = useState<HistoricalMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New match modal state
  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
          const upcomingRes = await fetch('/api/admin/upcoming-matches');
          if (upcomingRes.ok) {
            const upcomingData = await upcomingRes.json();
            setUpcoming(upcomingData.data?.filter((m: UpcomingMatch) => m.state !== 'Completed') || []);
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
        const [upcomingRes, historyRes] = await Promise.all([
          fetch('/api/admin/upcoming-matches'),
          fetch('/api/matches/history')
        ]);

        if (!upcomingRes.ok || !historyRes.ok) {
          throw new Error('Failed to fetch match data');
        }

        const upcomingData = await upcomingRes.json();
        const historyData = await historyRes.json();

        setUpcoming(upcomingData.data?.filter((m: UpcomingMatch) => m.state !== 'Completed') || []);
        setHistory(historyData.data || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderUpcomingList = () => (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800">Upcoming Matches</h2>
      </div>
      
      {/* Existing match list */}
      {upcoming.map(match => (
        <Link key={match.upcoming_match_id} href={`/admin/matches/${match.upcoming_match_id}`} className="block bg-white hover:shadow-lg transition-shadow duration-300 p-4 rounded-xl shadow-soft-xl border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-slate-500">Players in pool: {match._count.players}</p>
            </div>
            <span className="text-xs font-bold uppercase py-1 px-3 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md">{formatStateDisplay(match.state)}</span>
          </div>
        </Link>
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
        const isLegacy = !match.upcoming_match_id;
        const href = isLegacy ? '#' : `/admin/matches/${match.upcoming_match_id}`;

        return (
         <Link key={match.match_id} href={href} className={`block bg-white p-4 rounded-xl shadow-soft-xl border ${isLegacy ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg transition-shadow duration-300'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-slate-500 font-bold">{match.team_a_score} - {match.team_b_score}</p>
            </div>
             {isLegacy && <span className="text-xs text-gray-500 font-semibold">Legacy</span>}
          </div>
        </Link>
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
          {view === 'upcoming' ? renderUpcomingList() : renderHistoryList()}
        </div>
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