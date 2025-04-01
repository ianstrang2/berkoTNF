import React from 'react';
import ConfirmationDialog from './ConfirmationDialog.component';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isConfirming?: boolean;
}

// This is an adapter component that wraps ConfirmationDialog
// to match the interface expected by components using ConfirmationModal
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText,
  confirmButtonClass,
  isConfirming
}) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      onCancel={onClose}
      isConfirming={isConfirming}
    />
  );
};

export default ConfirmationModal; 