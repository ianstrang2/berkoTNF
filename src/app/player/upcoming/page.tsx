'use client';
import React from 'react';
import UpcomingMatchCard from '@/components/upcoming/UpcomingMatchCard.component';
import { useUpcomingMatches } from '@/hooks/queries/useUpcomingMatches.hook';

export default function UpcomingPage() {
  // React Query hook - automatic caching and deduplication!
  const { data: matches = [], isLoading, error } = useUpcomingMatches();

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
          <p className="text-red-500">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
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
