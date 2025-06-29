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
    // Wrapper for positioning. On desktop, it's a simple bar.
    // On mobile (<md), it becomes a fixed bar at the bottom.
    <div className="md:relative fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none p-4 md:p-0 border-t border-gray-700 md:border-none">
      <div className="container mx-auto md:mx-0">
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {label}
          </Button>
      </div>
    </div>
  );
};

export default GlobalCtaBar; 