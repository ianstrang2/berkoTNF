'use client';

import React from 'react';
import { useVotingResults } from '@/hooks/queries/useVotingResults.hook';

const CATEGORY_INFO: Record<string, { image: string; title: string }> = {
  mom: { image: '/img/player-status/mom.png', title: 'Man of the Match' },
  dod: { image: '/img/player-status/donkey.png', title: 'Donkey of the Day' },
  mia: { image: '/img/player-status/possum.png', title: 'Missing in Action' }
};

/**
 * VotingResults - Displays voting results after survey closes
 * 
 * Standalone dashboard section - uses shared useVotingResults hook.
 * Only renders after voting is closed and there are winners.
 * 
 * Styled to match Current Standings / Current Form components.
 */
const VotingResults: React.FC = () => {
  const { data: votingData, isLoading } = useVotingResults();

  // Don't render if loading or no data
  if (isLoading || !votingData || !votingData.hasWinners) {
    return null;
  }

  const { enabledCategories, results } = votingData;

  // Check if any category has winners
  const categoriesWithWinners = enabledCategories.filter(
    cat => results[cat]?.winners?.length > 0
  );

  if (categoriesWithWinners.length === 0) {
    return null;
  }

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
      {/* Header - matches Current Standings / Current Form style */}
      <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
        <h5 className="mb-0">Match Awards</h5>
      </div>

      {/* Results */}
      <div className="flex-auto px-4 pb-4 pt-2">
        <div className="space-y-4">
          {categoriesWithWinners.map((category) => {
            const info = CATEGORY_INFO[category];
            const categoryResults = results[category];
            
            if (!info || !categoryResults?.winners?.length) return null;
            
            return (
              <div key={category} className="flex items-start gap-3">
                {/* Category Icon - circular image with gradient border, image fills circle */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-700 p-[2px] flex-shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img 
                      src={info.image} 
                      alt={info.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                {/* Category Content */}
                <div className="flex-1 min-w-0">
                  <h6 className="font-semibold text-slate-800 text-sm mb-1">{info.title}</h6>
                  <div className="space-y-0.5">
                    {categoryResults.winners.map((winner) => (
                      <div 
                        key={winner.playerId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-700">
                          {winner.playerName}
                          {winner.isCoWinner && (
                            <span className="text-xs text-slate-400 ml-1">(tied)</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400">
                          {winner.voteCount} vote{winner.voteCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VotingResults;
