'use client';
import React from 'react';

const FairTeams: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Fair teams. Better games. Zero effort.
          </h2>
          <p className="text-2xl text-purple-600 font-semibold mb-4">
            Team selection that takes seconds — not arguments.
          </p>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Capo automatically builds balanced teams using everyone's recent performances. No spreadsheets. No long chats. It just works — and it feels fair.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Phone showing balanced teams */}
          <div className="relative">
            <div className="relative w-72 aspect-[9/19] mx-auto">
              <img 
                src="/img/marketing/team-balance.png"
                alt="AI team balancer for small-sided football – balanced 5-a-side teams in Capo"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Right: Feature Bullets */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Balanced automatically</h3>
              <p className="text-gray-700 leading-relaxed">
                Players' form and performances feed into a simple balancing engine that gives you fair sides out of the box.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Better football for everyone</h3>
              <p className="text-gray-700 leading-relaxed">
                Close, competitive games are more fun — and they keep people coming back.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Tweak when you want</h3>
              <p className="text-gray-700 leading-relaxed">
                Move players between teams or nudge things manually if you fancy it. Capo stays simple by default, powerful if you need it.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Friendly transparency</h3>
              <p className="text-gray-700 leading-relaxed">
                See a light "balance at a glance" score. No nerdy breakdowns. No need to justify anything. Just confidence that the game feels right.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FairTeams;
