'use client';
import React from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const HowItWorks: React.FC = () => {
  const sectionRef = useScrollReveal();

  const steps = [
    { number: '1', text: 'You create your club, share the code and players join.' },
    { number: '2', text: 'You create a match and players RSVP and pay.' },
    { number: '3', text: 'Capo handles all the ins/outs, fills the game and balances teams.' },
    { number: '4', text: 'You play and log the score in a couple of clicks.' },
    { number: '5', text: 'Capo creates a match report and updates all the stats behind the scenes.' },
    { number: '6', text: 'The next week is even easier.' },
  ];

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-white scroll-reveal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
            HOW CAPO FITS INTO YOUR WEEK
          </h2>
          <h3 className="text-2xl md:text-3xl font-semibold text-neutral-700">
            From "anyone playing?" to a game that runs itself — in a clean, simple loop.
          </h3>
        </div>

        {/* Steps Flow */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex items-center gap-6 p-6 bg-neutral-50 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300"
                style={{
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold rounded-full shadow-lg">
                  {step.number}
                </div>
                <p className="text-lg md:text-xl text-neutral-800 font-medium">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-2xl md:text-3xl font-semibold text-neutral-900">
            A football rhythm that finally makes sense — a casual football app that keeps your 5-a-side running every week.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

