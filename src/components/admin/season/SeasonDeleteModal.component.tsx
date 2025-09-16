'use client';
import React from 'react';
import { Season } from '@/types/season.types';

interface SeasonDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  season: Season | null;
}

const SeasonDeleteModal: React.FC<SeasonDeleteModalProps> = ({ 
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  season
}) => {
  if (!isOpen || !season) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (err) {
      // Error handling is done in parent component
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        
        {/* Modal panel */}
        <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6">
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-slate-700" id="modal-title">
              Delete Season
            </h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              aria-label="Close"
              disabled={isProcessing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Warning content */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tl from-purple-700 to-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-slate-700">Delete Season?</h4>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              You are about to delete the <strong>{season.displayName}</strong> season definition.
            </p>
            
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Note:</strong> This only removes the season date range. Your matches, player data, and stats will not be affected.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end pt-2 border-t border-slate-200 mt-4">
            <button
              type="button"
              className="mr-3 inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-fuchsia-500 to-pink-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonDeleteModal;
