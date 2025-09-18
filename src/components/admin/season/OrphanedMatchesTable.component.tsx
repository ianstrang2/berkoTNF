'use client';
import React, { useState, useEffect } from 'react';
import { OrphanedMatch } from '@/app/api/matches/orphaned/route';

interface OrphanedMatchesResponse {
  success: boolean;
  data?: OrphanedMatch[];
  error?: string;
}

const OrphanedMatchesTable: React.FC = () => {
  const [orphanedMatches, setOrphanedMatches] = useState<OrphanedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchOrphanedMatches();
    
    // Listen for refresh events from season edits
    const handleRefresh = () => {
      fetchOrphanedMatches();
    };
    
    window.addEventListener('refreshOrphanedMatches', handleRefresh);
    return () => window.removeEventListener('refreshOrphanedMatches', handleRefresh);
  }, []);

  const fetchOrphanedMatches = async () => {
    try {
      const response = await fetch('/api/matches/orphaned');
      const data: OrphanedMatchesResponse = await response.json();
      
      if (data.success && data.data) {
        setOrphanedMatches(data.data);
      } else {
        setError(data.error || 'Failed to fetch orphaned matches');
      }
    } catch (err) {
      setError('Failed to fetch orphaned matches');
      console.error('Error fetching orphaned matches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (orphanedMatches.length === 0) {
    return null; // Don't show anything if no orphaned matches
  }

  return (
    <div className="break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border border-l-4 border-yellow-400">
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-lg bg-yellow-400 flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h5 className="mb-0 text-lg font-semibold text-slate-700">
            Orphaned Matches
          </h5>
          <span className="ml-2 inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            {orphanedMatches.length}
          </span>
        </div>
        <p className="mb-0 text-sm text-slate-500 mt-2">
          These matches are not covered by any season date range
        </p>
      </div>
      <div className="p-4">
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Warning:</strong> These matches won't appear in season statistics until you adjust your season dates.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
            <thead className="align-bottom">
              <tr>
                <th className="px-6 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  Match Date
                </th>
                <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  Score
                </th>
                <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orphanedMatches.map((match) => (
                <tr key={match.match_id}>
                  <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                    <div className="flex px-2 py-1">
                      <div className="flex flex-col justify-center">
                        <h6 className="mb-0 text-sm leading-normal font-semibold">
                          {new Date(match.match_date).toLocaleDateString()}
                        </h6>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                    <span className="text-sm font-medium">
                      {match.team_a_score} - {match.team_b_score}
                    </span>
                  </td>
                  <td className="p-2 text-center align-middle bg-transparent border-b whitespace-nowrap shadow-transparent">
                    <a
                      href={`/admin/matches?view=history&match=${match.match_id}`}
                      className="inline-block px-3 py-1 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                      title="View match details"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrphanedMatchesTable;
