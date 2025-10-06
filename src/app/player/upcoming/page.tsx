'use client';
import React, { useState, useEffect } from 'react';
import UpcomingMatchCard from '@/components/upcoming/UpcomingMatchCard.component';

interface UpcomingMatch {
  upcoming_match_id: number;
  match_date: string;
  state: string;
  _count: {
    players: number;
  };
  team_size: number;
  actual_size_a?: number;
  actual_size_b?: number;
}

export default function UpcomingPage() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingMatches = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/upcoming', { cache: 'no-store' });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch upcoming matches');
        }
        
        setMatches(result.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingMatches();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-slate-600">Loading upcoming matches...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">Error: {error}</p>
        </div>
      );
    }

    if (matches.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-500">No upcoming matches scheduled.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-w-xl">
        {matches.map(match => (
          <UpcomingMatchCard key={match.upcoming_match_id} match={match} />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Upcoming Matches
        </h2>
      </div>
      
      {renderContent()}
    </>
  );
}
