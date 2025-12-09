'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiConfig';

interface EligiblePlayer {
  id: number;
  name: string;
  selectedClub?: string | null;
}

interface ActiveSurvey {
  id: string;
  matchId: number;
  matchDate?: string;
  matchScore?: { teamA: number; teamB: number };
  enabledCategories: string[];
  eligiblePlayers: EligiblePlayer[];
  userVotes: Record<string, number | null>;
  hasVoted: boolean;
  totalVoters: number;
  totalEligible: number;
  votingClosesAt: string;
  timeRemainingMs: number;
}

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoteSubmitted?: () => void;
}

const CATEGORY_INFO: Record<string, { icon: string; title: string; description: string }> = {
  mom: { 
    icon: '💪', 
    title: 'Man of the Match', 
    description: 'Who was the best player?'
  },
  dod: { 
    icon: '🫏', 
    title: 'Donkey of the Day', 
    description: 'Who had a nightmare?'
  },
  mia: { 
    icon: '🦝', 
    title: 'Missing in Action', 
    description: 'Who was invisible?'
  }
};

/**
 * VotingModal - Modal for submitting post-match votes
 * 
 * Features:
 * - Shows each enabled category with player list
 * - "No-one / Skip" option at top of each category
 * - Pre-fills existing votes
 * - Shows vote count and time remaining
 */
const VotingModal: React.FC<VotingModalProps> = ({ isOpen, onClose, onVoteSubmitted }) => {
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Track selected votes - null means "No-one / Skip"
  const [selectedVotes, setSelectedVotes] = useState<Record<string, number | null>>({});
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Fetch survey data
  const fetchSurvey = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch('/voting/active');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch survey');
      }
      
      if (!data.hasActiveSurvey || !data.isEligible) {
        setError('No active voting available');
        return;
      }
      
      setSurvey(data.survey);
      
      // Initialize selected votes from existing votes
      // Default to null (skip) for categories without votes
      const initialVotes: Record<string, number | null> = {};
      for (const category of data.survey.enabledCategories) {
        initialVotes[category] = data.survey.userVotes[category] ?? null;
      }
      setSelectedVotes(initialVotes);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load voting');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSurvey();
      setSuccess(false);
    }
  }, [isOpen, fetchSurvey]);

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
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-white">Post-Match Voting</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-700">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          ) : success ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Votes Submitted!</h3>
              <p className="text-gray-500 mt-1">Thanks for voting</p>
            </div>
          ) : survey ? (
            <div className="p-4">
              {/* Categories */}
              {survey.enabledCategories.map((category) => {
                const info = CATEGORY_INFO[category];
                if (!info) return null;
                
                return (
                  <div key={category} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{info.title}</h3>
                        <p className="text-xs text-gray-500">{info.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 bg-gray-50 rounded-lg p-2">
                      {/* Skip option */}
                      <label 
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedVotes[category] === null
                            ? 'bg-purple-100 border-2 border-purple-400'
                            : 'bg-white border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name={category}
                          checked={selectedVotes[category] === null}
                          onChange={() => handleVoteChange(category, null)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedVotes[category] === null
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedVotes[category] === null && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-600 italic">No-one / Skip</span>
                      </label>
                      
                      {/* Player options */}
                      {survey.eligiblePlayers.map((player) => (
                        <label 
                          key={player.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            selectedVotes[category] === player.id
                              ? 'bg-purple-100 border-2 border-purple-400'
                              : 'bg-white border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name={category}
                            checked={selectedVotes[category] === player.id}
                            onChange={() => handleVoteChange(category, player.id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedVotes[category] === player.id
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedVotes[category] === player.id && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{player.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {survey && !loading && !error && !success && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
            {/* Stats row */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span>{survey.totalVoters} of {survey.totalEligible} have voted</span>
              <span>⏱️ {timeRemaining}</span>
            </div>
            
            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-3 text-sm font-semibold text-white uppercase bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Votes'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingModal;

