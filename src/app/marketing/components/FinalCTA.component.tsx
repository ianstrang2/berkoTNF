'use client';
import React from 'react';
import Button from '@/components/ui-kit/Button.component';

interface FinalCTAProps {
  onGetApp: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onGetApp }) => {
  // Get app URL from env, or use current origin (adapts to any port in dev)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  
  return (
    <section className="relative py-32 md:py-40 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800" />
      
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          THE 5-A-SIDE FOOTBALL APP YOUR MATES WILL OBSESS OVER.
        </h2>
        
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
          THE GAME THAT RUNS ITSELF.
        </h3>
        
        <p className="text-2xl md:text-3xl font-semibold text-white mb-12">
          FREE FOREVER FOR ORGANISERS.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button
            variant="primary"
            size="lg"
            onClick={onGetApp}
            className="text-base px-8 py-4 bg-white text-purple-700 hover:bg-neutral-100 border-0 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
          >
            Get the App
          </Button>
          <a href={`${appUrl}/auth/login`}>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 py-4 border-white text-white hover:bg-white/10"
            >
              Open App
            </Button>
          </a>
        </div>

        <p className="text-white/80 text-base">
          <span className="text-sm italic">
            If you prefer collecting money yourselves, Capo stays 100% free for everyone.
          </span>
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
    </section>
  );
};

export default FinalCTA;

