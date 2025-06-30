'use client';

import React from 'react';
import Button from '@/components/ui-kit/Button.component';

interface GlobalCtaBarProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const GlobalCtaBar: React.FC<GlobalCtaBarProps> = ({ label, onClick, disabled = false }) => {
  return (
    // This container handles the responsive positioning.
    <div
      className="
        max-md:fixed max-md:bottom-0 max-md:left-0 max-md:w-full max-md:z-30 
        max-md:p-4 max-md:pb-6 max-md:bg-white max-md:shadow-soft-xl-top
        md:relative md:w-full md:mt-6
      "
    >
      <div className="md:max-w-4xl md:mx-auto">
        <Button
          onClick={onClick}
          disabled={disabled}
          variant="primary"
          size="lg"
          className="w-full bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md"
        >
          {label}
        </Button>
      </div>
    </div>
  );
};

export default GlobalCtaBar; 