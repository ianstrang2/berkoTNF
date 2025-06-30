'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout.layout';

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

  const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
  const [history, setHistory] = useState<HistoricalMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      {upcoming.map(match => (
        <Link key={match.upcoming_match_id} href={`/admin/matches/${match.upcoming_match_id}`} className="block bg-white hover:shadow-lg transition-shadow duration-300 p-4 rounded-xl shadow-soft-xl border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-slate-500">Players in pool: {match._count.players}</p>
            </div>
            <span className="text-xs font-bold uppercase py-1 px-3 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md">{match.state}</span>
          </div>
        </Link>
      ))}
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