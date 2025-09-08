'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui-kit/Button.component';

interface MatchCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
}

const MatchCompletedModal: React.FC<MatchCompletedModalProps> = ({
  isOpen,
  onClose,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleMatchReport = () => {
    onClose();
    router.push('/');
  };

  const handleHistory = () => {
    onClose();
    router.push('/admin/matches?view=history');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Semi-transparent overlay */}
        <div 
          className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Center dialog */}
        <span 
          className="hidden sm:inline-block sm:align-middle sm:h-screen" 
          aria-hidden="true"
        >
          &#8203;
        </span>
        
        <div 
          className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-soft-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Match Saved Successfully
            </h3>
            
            {/* Description */}
            <p className="text-slate-600 mb-6">
              Stats will recalculate in ~60 seconds
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Close
              </Button>
              <Button 
                onClick={handleMatchReport}
                className="flex-1 bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md"
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchCompletedModal; 