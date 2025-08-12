'use client';

import React from 'react';
import Button from '@/components/ui-kit/Button.component';

interface GlobalCtaBarProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}

const GlobalCtaBar: React.FC<GlobalCtaBarProps> = ({ label, onClick, disabled = false, hint }) => {
  const isLoading = label.includes('Saving...') || label.includes('Loading...');
  
  return (
    // This container handles the responsive positioning.
    <div
      className="
        max-md:fixed max-md:bottom-16 max-md:left-0 max-md:w-full max-md:z-30 
        max-md:p-4 max-md:pb-6 max-md:bg-white max-md:shadow-soft-xl-top
        md:relative md:w-full md:mt-6
      "
    >
      <div className="md:max-w-4xl md:mx-auto">
        {hint && (
          <p className="text-sm text-gray-600 text-center mb-3 px-4">
            {hint}
          </p>
        )}
        <Button
          onClick={onClick}
          disabled={disabled}
          variant="primary"
          size="lg"
          className={`w-full bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center justify-center">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 flex-shrink-0" />
            )}
            <span>{label}</span>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default GlobalCtaBar; 