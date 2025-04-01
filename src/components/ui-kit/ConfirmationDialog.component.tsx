'use client';
import React from 'react';
import { Button } from './index';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity" 
          aria-hidden="true"
          onClick={onCancel}
        >
          <div className="absolute inset-0 bg-neutral-500 opacity-75"></div>
        </div>

        {/* Center dialog */}
        <span 
          className="hidden sm:inline-block sm:align-middle sm:h-screen" 
          aria-hidden="true"
        >
          &#8203;
        </span>
        
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full px-4 pt-5 pb-4 sm:p-6"
          onClick={e => e.stopPropagation()}
        >
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-neutral-900">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-neutral-500">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <Button
              onClick={onConfirm}
              disabled={isConfirming}
              variant="primary"
              className="w-full sm:w-auto sm:ml-3"
            >
              {isConfirming ? 'Processing...' : confirmText}
            </Button>
            <Button
              onClick={onCancel}
              disabled={isConfirming}
              variant="outline"
              className="w-full mt-3 sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog; 