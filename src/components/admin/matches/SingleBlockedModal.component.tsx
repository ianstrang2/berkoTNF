'use client';

import React, { useEffect, useCallback } from 'react';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

interface SingleBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolSize: number;
}

const SingleBlockedModal = ({ isOpen, onClose, poolSize }: SingleBlockedModalProps) => {
  // Enhanced UX: Handle ESC key and prevent double-actions
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <SoftUIConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Too Few Players"
      message="8 players (4v4) is the minimum."
      confirmText="Got It"
      icon="warning"
      onConfirm={onClose}
    />
  );
};

export default SingleBlockedModal;