'use client';

import React, { useState, useEffect } from 'react';
import { useVotingActive } from '@/hooks/queries/useVotingActive.hook';

interface VotingBannerProps {
  onVoteClick: () => void;
}

/**
 * VotingBanner - Shows when there's an active survey the user can vote in
 * 
 * Displays:
 * - "Vote Now" button if user hasn't voted
 * - "Change Vote" button if user has already voted
 * - Countdown timer showing time remaining
 */
const VotingBanner: React.FC<VotingBannerProps> = ({ onVoteClick }) => {
  const { data: surveyData, isLoading } = useVotingActive();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update countdown timer
  useEffect(() => {
    if (!surveyData?.survey?.votingClosesAt) return;
    
    const updateTimer = () => {
      const closesAt = new Date(surveyData.survey!.votingClosesAt);
      const now = new Date();
      const diffMs = closesAt.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeRemaining('Closed');
        return;
      }
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m left`);
      }
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [surveyData?.survey?.votingClosesAt]);

  // Don't show if loading, no active survey, or user not eligible
  if (isLoading || !surveyData?.hasActiveSurvey || !surveyData?.isEligible) {
    return null;
  }

  const hasVoted = surveyData.survey?.hasVoted ?? false;

  return (
    <div className="bg-gradient-to-br from-pink-500 to-purple-700 rounded-xl p-[2px] mb-4 shadow-soft-lg">
      <div className="bg-white rounded-[10px] px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onVoteClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
          >
            {/* Clipboard icon with gradient */}
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            
            <div className="flex flex-col text-left">
              <div className="text-slate-800 font-semibold text-sm">Voting Open</div>
              <div className="text-slate-600 text-xs">
                {timeRemaining || 'Vote for match awards'}
              </div>
            </div>
          </button>
          
          <button
            onClick={onVoteClick}
            className="px-4 py-2 bg-gradient-to-br from-pink-500 to-purple-700 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            {hasVoted ? 'Change Vote' : 'Vote Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VotingBanner;

