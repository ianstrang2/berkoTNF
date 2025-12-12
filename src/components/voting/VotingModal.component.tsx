'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiConfig';
import { useVotingActive, VotingActiveSurvey } from '@/hooks/queries/useVotingActive.hook';

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoteSubmitted?: () => void;
}

const CATEGORY_INFO: Record<string, { imageSrc: string; title: string }> = {
  mom: { 
    imageSrc: '/img/player-status/mom.png', 
    title: 'Man of the Match'
  },
  dod: { 
    imageSrc: '/img/player-status/donkey.png', 
    title: 'Donkey of the Day'
  },
  mia: { 
    imageSrc: '/img/player-status/possum.png', 
    title: 'Missing in Action'
  }
};

const VotingModal: React.FC<VotingModalProps> = ({ isOpen, onClose, onVoteSubmitted }) => {
  const { data: surveyData, isLoading: loading, refetch, invalidate } = useVotingActive();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  
  // Track selected votes - null means "No-one / Skip"
  const [selectedVotes, setSelectedVotes] = useState<Record<string, number | null>>({});
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Derive survey from hook data
  const survey: VotingActiveSurvey | null = surveyData?.survey ?? null;
  const enabledCategories = survey?.enabledCategories || [];

  // Refetch when modal opens
  useEffect(() => {
    if (isOpen) {
      refetch();
      setSuccess(false);
      setError(null);
      setCurrentStage(0);
    }
  }, [isOpen, refetch]);
  
  // Initialize selected votes when survey data changes
  useEffect(() => {
    if (!surveyData?.isEligible || !survey?.enabledCategories) {
      if (surveyData && !surveyData.isEligible && surveyData.hasActiveSurvey) {
        setError('No active voting available');
      }
      return;
    }
    
    // Initialize selected votes from existing votes
    const initialVotes: Record<string, number | null> = {};
    for (const category of survey.enabledCategories) {
      initialVotes[category] = survey.userVotes?.[category] ?? null;
    }
    setSelectedVotes(initialVotes);
  }, [surveyData, survey]);

  // Update countdown timer
  useEffect(() => {
    if (!survey?.votingClosesAt) return;
    
    const updateTimer = () => {
      const closesAt = new Date(survey.votingClosesAt);
      const now = new Date();
      const diffMs = closesAt.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeRemaining('Voting closed');
        return;
      }
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 60000);
    return () => clearInterval(timer);
  }, [survey?.votingClosesAt]);

  // Handle vote selection
  const handleVoteChange = (category: string, playerId: number | null) => {
    setSelectedVotes(prev => ({
      ...prev,
      [category]: playerId
    }));
  };

  // Navigate stages
  const handleNext = () => {
    if (currentStage < enabledCategories.length - 1) {
      setCurrentStage(curr => curr + 1);
    } else {
      // Last stage - submit
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStage > 0) {
      setCurrentStage(curr => curr - 1);
    }
  };

  // Submit votes
  const handleSubmit = async () => {
    if (!survey) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await apiFetch('/voting/submit', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: survey.id,
          votes: selectedVotes
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit votes');
      }
      
      setSuccess(true);
      onVoteSubmitted?.();
      
      // Invalidate cache so banner updates
      invalidate();
      
      // Close modal after brief success message
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Failed to submit votes');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategory = enabledCategories[currentStage];
  const categoryInfo = currentCategory ? CATEGORY_INFO[currentCategory] : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-20 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-pink-500 to-purple-700 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-white">Post-Match Voting</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-700">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Votes Submitted!</h3>
              <p className="text-xs text-gray-500 mt-1">Thanks for voting</p>
            </div>
          ) : survey && categoryInfo ? (
            <>
              {/* Category header */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-700 p-[2px] shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img 
                      src={categoryInfo.imageSrc} 
                      alt={categoryInfo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mt-2">{categoryInfo.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{currentStage + 1} of {enabledCategories.length}</p>
              </div>
              
              {/* Player pills grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Skip option - behaves like any other selection */}
                <button
                  onClick={() => handleVoteChange(currentCategory, null)}
                  className={`col-span-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedVotes[currentCategory] === null
                      ? 'bg-gradient-to-br from-pink-500 to-purple-700 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  No-one / Skip
                </button>
                
                {/* Player pills */}
                {(survey.eligiblePlayers || []).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleVoteChange(currentCategory, player.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all truncate ${
                      selectedVotes[currentCategory] === player.id
                        ? 'bg-gradient-to-br from-pink-500 to-purple-700 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-2">
                {currentStage > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className={`${currentStage === 0 ? 'w-full' : 'flex-1'} px-4 py-2 text-xs font-semibold text-white uppercase bg-gradient-to-br from-pink-500 to-purple-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50`}
                >
                  {submitting ? 'Submitting...' : currentStage === enabledCategories.length - 1 ? 'Submit' : 'Next'}
                </button>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                <span>{survey.totalVoters} of {survey.totalEligible} voted</span>
                <span>{timeRemaining}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VotingModal;
