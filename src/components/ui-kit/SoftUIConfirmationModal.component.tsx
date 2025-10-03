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
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question';
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
  icon = 'warning',
}) => {
  // Handle the case where isConfirming changes from true to false
  // This closes any stuck loading modals
  React.useEffect(() => {
    if (!isConfirming && Swal.isVisible()) {
      Swal.close();
    }
  }, [isConfirming]);

  // Handle modal visibility and state
  React.useEffect(() => {
    if (!isOpen) {
      // Close any existing SweetAlert when modal should be closed
      if (Swal.isVisible()) {
        Swal.close();
      }
      return;
    }

    // Define custom button styling based on soft-UI design system
    const swalWithSoftUI = Swal.mixin({
      customClass: {
        popup: 'rounded-2xl shadow-soft-xl',
        title: 'text-lg leading-6 font-medium text-slate-700',
        htmlContainer: 'text-sm text-slate-500',
        icon: 'swal2-icon-custom-gradient',
        confirmButton: 'inline-block px-4 py-2 font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro text-xs ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25',
        cancelButton: 'ml-3 inline-block px-4 py-2 font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro text-xs ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate-fade-in-up'
      },
      hideClass: {
        popup: 'animate-fade-out-down'
      },
      iconColor: 'transparent' // We'll use gradient via CSS
    });

    // Create the base modal configuration
    const modalConfig: SweetAlertOptions = {
      title: title,
      html: typeof message === 'string' ? message : <div>{message}</div>,
      icon: icon,
      showCancelButton: true,
      confirmButtonText: isConfirming ? 'Processing...' : confirmText,
      cancelButtonText: cancelText,
      reverseButtons: false,
      allowOutsideClick: !isConfirming,
      allowEscapeKey: !isConfirming,
    };

    // If we're in confirming state, show loading state but allow it to be closed
    if (isConfirming) {
      swalWithSoftUI.fire({
        ...modalConfig,
        showLoaderOnConfirm: false, // Don't use the built-in loader
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          // Disable the confirm button to show loading state
          const confirmButton = Swal.getConfirmButton();
          if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.style.opacity = '0.6';
          }
          // Disable the cancel button during processing
          const cancelButton = Swal.getCancelButton();
          if (cancelButton) {
            cancelButton.disabled = true;
            cancelButton.style.opacity = '0.6';
          }
        }
      });
    } else {
      // Normal operation (not in confirming state)
      swalWithSoftUI.fire(modalConfig).then((result) => {
        if (result.isConfirmed) {
          onConfirm();
        } else if (result.isDismissed) {
          onClose();
        }
      });
    }
  }, [isOpen, title, message, confirmText, cancelText, isConfirming, icon, onClose, onConfirm]);

  // This component doesn't directly render anything
  return null;
};

export default SoftUIConfirmationModal; 