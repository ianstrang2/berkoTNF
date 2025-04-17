'use client';
import React from 'react';
import Swal, { SweetAlertOptions } from 'sweetalert2';

interface SoftUIConfirmationModalProps {
  // Modal state
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  
  // Modal content
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  
  // Modal appearance
  isConfirming?: boolean;
}

const SoftUIConfirmationModal: React.FC<SoftUIConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
}) => {
  // Only display the modal if isOpen is true
  React.useEffect(() => {
    if (isOpen) {
      // Define custom button styling based on soft-UI design system
      const swalWithSoftUI = Swal.mixin({
        customClass: {
          popup: 'rounded-2xl shadow-soft-xl',
          title: 'text-lg leading-6 font-medium text-slate-700',
          htmlContainer: 'text-sm text-slate-500',
          confirmButton: 'inline-block px-6 py-3 font-bold text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro text-xs ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25',
          cancelButton: 'ml-3 inline-block px-6 py-3 font-bold text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro text-xs ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25'
        },
        buttonsStyling: false,
        showClass: {
          popup: 'animate-fade-in-up'
        },
        hideClass: {
          popup: 'animate-fade-out-down'
        }
      });

      // Create the base modal configuration
      const modalConfig: SweetAlertOptions = {
        title: title,
        html: typeof message === 'string' ? message : <div>{message}</div>,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: isConfirming ? 'Processing...' : confirmText,
        cancelButtonText: cancelText,
        reverseButtons: false,
        allowOutsideClick: !isConfirming,
        allowEscapeKey: !isConfirming,
        allowEnterKey: !isConfirming
      };

      // If we're in confirming state, use a different approach with preConfirm
      if (isConfirming) {
        // When confirming, we need to handle the loading state properly
        swalWithSoftUI.fire({
          ...modalConfig,
          showLoaderOnConfirm: true,
          preConfirm: () => {
            // Return a promise that doesn't resolve automatically
            // This keeps the loading state visible until we close it programmatically
            return new Promise(() => {});
          },
          didOpen: () => {
            Swal.disableButtons();
          }
        });
      } else {
        // Normal operation (not in confirming state)
        swalWithSoftUI.fire(modalConfig).then((result) => {
          if (result.isConfirmed) {
            onConfirm();
          } else {
            onClose();
          }
        });
      }
    }
  }, [isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isConfirming]);

  // This component doesn't directly render anything
  return null;
};

export default SoftUIConfirmationModal; 