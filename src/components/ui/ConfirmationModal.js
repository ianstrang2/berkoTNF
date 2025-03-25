import React from 'react';
import ConfirmationDialog from './ConfirmationDialog';

// This is an adapter component that wraps ConfirmationDialog
// to match the interface expected by components using ConfirmationModal
const ConfirmationModal = ({
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