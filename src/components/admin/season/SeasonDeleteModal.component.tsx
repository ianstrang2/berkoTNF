'use client';
import React from 'react';
import { Season } from '@/types/season.types';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

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
  if (!season) return null;

  return (
    <SoftUIConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Season?"
      message={`
        <div class="text-left">
          <p class="text-sm text-slate-600 mb-3">
            You are about to delete the <strong>${season.displayName}</strong> season definition.
          </p>
          
          <div class="p-3 border border-slate-200 rounded-lg">
            <p class="text-sm text-slate-600">
              <strong>Note:</strong> This only removes the season date range. Your matches, player data, and stats will not be affected.
            </p>
          </div>
        </div>
      `}
      confirmText="Delete Season"
      cancelText="Cancel"
      isConfirming={isProcessing}
      icon="warning"
    />
  );
};

export default SeasonDeleteModal;
