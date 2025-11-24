'use client';
import React from 'react';
import Button from '@/components/ui-kit/Button.component';

interface HeroProps {
  onGetApp: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetApp }) => {
  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        WebkitPaddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/img/marketing/hero-pitch-night.jpg)' }}
      />
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-800/70 to-neutral-900/80" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 animate-fade-in-up leading-tight">
          <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            CAPO
          </span>
          <span className="sr-only"> – 5-a-side football app</span>
        </h1>
        
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          The 5-a-side football app your mates will obsess over.
        </h2>
        
        <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/90 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          And the game that finally runs itself.
        </h3>
        
        <div className="max-w-3xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-lg sm:text-xl text-white leading-relaxed">
            Capo is the casual football app that pulls everything into one clean, addictive, brilliantly simple football system —{' '}
            <strong className="text-white font-bold">
              fantasy-style stats and profiles for the players, zero admin for the organiser, fair teams every week.
            </strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={onGetApp}
            className="text-base px-8 py-4 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
          >
            Get the App
          </Button>
        </div>

        <p className="text-white/80 text-base animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <strong className="font-semibold">Free forever for organisers.</strong>
          <br />
          <span className="text-sm">Players only pay a small per-match fee if your group uses in-app payments.</span>
        </p>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-white/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;

