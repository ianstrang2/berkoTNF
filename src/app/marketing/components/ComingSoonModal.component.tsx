'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui-kit/Button.component';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-neutral-900 mb-4">
            Coming Soon!
          </h3>

          <p className="text-lg text-neutral-700 mb-2">
            Capo will be available on <strong>iOS & Android</strong> soon.
          </p>

          <p className="text-neutral-600 mb-8">
            For now, you can use the web app to manage your matches and view your stats.
          </p>

          <div className="space-y-3">
            <Link href="/auth/login" className="block">
              <Button
                variant="primary"
                size="lg"
                className="w-full text-base"
                onClick={onClose}
              >
                Try the Web App →
              </Button>
            </Link>

            <button
              onClick={onClose}
              className="w-full text-neutral-600 hover:text-neutral-800 transition-colors py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;

