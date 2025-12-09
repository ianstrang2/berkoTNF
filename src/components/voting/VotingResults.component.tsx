'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiConfig';

interface AwardWinner {
  playerId: number;
  playerName: string;
  voteCount: number;
  isCoWinner: boolean;
}

interface CategoryResults {
  winners: AwardWinner[];
  totalVotes: number;
}

interface VotingResultsProps {
  matchId: number;
}

const CATEGORY_INFO: Record<string, { icon: string; title: string }> = {
  mom: { icon: '💪', title: 'Man of the Match' },
  dod: { icon: '🫏', title: 'Donkey of the Day' },
  mia: { icon: '🦝', title: 'Missing in Action' }
};

/**
 * VotingResults - Displays voting results after survey closes
 * 
 * Shows in MatchReport beneath Milestones section.
 * Only renders after voting is closed and there are winners.
 */
const VotingResults: React.FC<VotingResultsProps> = ({ matchId }) => {
  const [results, setResults] = useState<Record<string, CategoryResults> | null>(null);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasWinners, setHasWinners] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await apiFetch(`/voting/results/${matchId}`);
        const data = await response.json();
        
        if (data.success && !data.votingOpen && data.hasWinners) {
          setResults(data.results);
          setEnabledCategories(data.enabledCategories || []);
          setHasWinners(true);
        }
      } catch (err) {
        console.error('Failed to fetch voting results:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [matchId]);

  // Don't render if loading, no results, or no winners
  if (loading || !results || !hasWinners) {
    return null;
  }

  // Check if any category has winners
  const categoriesWithWinners = enabledCategories.filter(
    cat => results[cat]?.winners?.length > 0
  );

  if (categoriesWithWinners.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-soft-xl border border-gray-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span className="text-xl">🏆</span>
          Match Awards
        </h3>
      </div>

      {/* Results */}
      <div className="p-4 space-y-4">
        {categoriesWithWinners.map((category) => {
          const info = CATEGORY_INFO[category];
          const categoryResults = results[category];
          
          if (!info || !categoryResults?.winners?.length) return null;
          
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{info.icon}</span>
                <h4 className="font-semibold text-gray-900">{info.title}</h4>
              </div>
              
              <div className="space-y-1 ml-7">
                {categoryResults.winners.map((winner, index) => (
                  <div 
                    key={winner.playerId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-800">
                      {winner.playerName}
                      {winner.isCoWinner && (
                        <span className="text-xs text-gray-500 ml-1">(tied)</span>
                      )}
                    </span>
                    <span className="text-sm text-gray-500">
                      {winner.voteCount} vote{winner.voteCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingResults;

