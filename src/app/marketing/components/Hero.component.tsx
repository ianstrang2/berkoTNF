'use client';
import React from 'react';
import Image from 'next/image';
import Button from '@/components/ui-kit/Button.component';

interface HeroProps {
  onGetApp: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetApp }) => {
  return (
    <section className="relative min-h-screen pt-safe overflow-hidden">
      {/* Background Image - using Next Image with priority for fast load */}
      <Image
        src="/img/marketing/Hero Image Capo.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-800/70 to-neutral-900/80" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-white space-y-8 animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                The 5-a-side app your mates will obsess over.
              </span>
            </h1>
            
            <h2 className="text-2xl sm:text-3xl font-semibold text-purple-200">
              Make your kickabout something they talk about all week.
            </h2>
            
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
              Capo is the casual football app that turns your weekly game into a proper experience — fantasy-style stats and profiles for the players, no-stress admin for the organiser, and AI-balanced teams every time.
            </p>

            {/* Key Bullets */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-base">Player stats, streaks & AI profiles</span>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-base">AI-balanced teams = no more arguments</span>
              </div>
              
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-base">RSVPs, dropouts & payments handled</span>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                onClick={onGetApp}
                className="text-base px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Get the app
              </Button>
              
              <p className="text-white/80 text-sm">
                <strong className="font-semibold">Free forever for organisers.</strong>
                <br />
                Players only pay a small per-match fee if you use in-app payments.
              </p>
            </div>
          </div>

          {/* Right: Phone Mockups */}
          <div className="relative lg:h-[750px] h-[550px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Main Phone (Stats Screen) - images include device frame */}
            <div className="absolute top-0 right-0 lg:right-10 w-64 lg:w-72 aspect-[9/19]">
              <img 
                src="/img/marketing/hero-phone-stats.png" 
                alt="football stats app for casual 5-a-side and 7-a-side players – Capo profile screen"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>

            {/* Secondary Phone (Team Balance) */}
            <div className="absolute top-24 left-0 lg:left-10 w-56 lg:w-64 aspect-[9/19] opacity-90">
              <img 
                src="/img/marketing/hero-phone-teams.png" 
                alt="AI team balancer for small-sided football – balanced 5-a-side teams in Capo"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
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
