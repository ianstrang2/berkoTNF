'use client';
import React from 'react';

const MatchControl: React.FC = () => {
  const weekSteps = [
    {
      number: 1,
      title: 'Set up your group',
      description: 'Create your club, share the join code, players hop in.'
    },
    {
      number: 2,
      title: 'Create a match',
      description: 'Set time & place. Players RSVP and pay.'
    },
    {
      number: 3,
      title: 'Capo fills and balances the game',
      description: 'Ins, outs, dropouts, waiting list, fair teams — handled.'
    },
    {
      number: 4,
      title: 'You play — then log the result in seconds',
      description: 'Add the score, hit finish. That\'s it.'
    },
    {
      number: 5,
      title: 'Capo handles all the hype',
      description: 'Stats, streaks, AI profiles and the match report are ready for the group chat — and for the pub.'
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4">Built for Real 5-a-side Life</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Built for the chaos around the game.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Capo isn't just a pretty stats app. It's built for all the messy stuff before and after a match — the WhatsApp noise, the last-minute guests, the final score, the post-game chat.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left: Phone showing Match Control Centre */}
          <div className="relative">
            <div className="relative w-72 aspect-[9/19] mx-auto">
              <img 
                src="/img/marketing/match-control.png"
                alt="football match organiser showing pitch-side control screen in Capo"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Right: Description */}
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-gray-900">Match Control Centre</h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              One pitch-side screen with everything: the player pool, the teams, the score entry and the finish button. Just enter who scored and mark the game as done — Capo updates:
            </p>
            <ul className="grid grid-cols-2 gap-3">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Tables</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Streaks</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Points</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Records</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Chemistry</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Performance graphs</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Every player's AI profile</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">The match report</span>
              </li>
            </ul>
            <p className="text-lg text-gray-700 leading-relaxed font-semibold">
              Your post-game admin fits inside a single tap.
            </p>
          </div>
        </div>

        {/* How Your Week Works Timeline */}
        <div className="mt-20">
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            How Capo fits into your week
          </h3>

          {/* Desktop: Horizontal Timeline */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute top-12 left-0 right-0 h-1 bg-purple-200" />
              
              <div className="relative grid grid-cols-5 gap-4">
                {weekSteps.map((step) => (
                  <div key={step.number} className="relative">
                    {/* Circle */}
                    <div className="flex justify-center mb-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg hover:scale-110 transition-transform z-10 relative">
                        {step.number}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="text-center">
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">
                        {step.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: Vertical Stack */}
          <div className="lg:hidden space-y-6">
            {weekSteps.map((step) => (
              <div key={step.number} className="flex gap-4">
                {/* Circle */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-2">
                  <h4 className="font-bold text-gray-900 mb-1 text-base">
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MatchControl;

