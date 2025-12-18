'use client';
import React, { useState } from 'react';

const ForPlayers: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const screens = [
    { 
      id: 'profile', 
      label: 'AI Profile', 
      image: '/img/marketing/player-ai-profile.png',
      alt: 'football stats app showing AI-written player profile for casual 5-a-side players'
    },
    { 
      id: 'stats', 
      label: 'Stats & Form', 
      image: '/img/marketing/player-stats.png',
      alt: 'football performance tracker showing goals, assists and stats over time'
    },
    { 
      id: 'streaks', 
      label: 'Streaks', 
      image: '/img/marketing/player-streaks.png',
      alt: 'football streak tracker showing attendance runs and scoring streaks'
    },
    { 
      id: 'report', 
      label: 'Match Report', 
      image: '/img/marketing/player-match-report.png',
      alt: 'football match report showing goals, assists and streaks for casual players in Capo'
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4">For Players</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Your football story, told properly.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Capo turns your casual five-a-side into something everyone actually cares about — stats, streaks, match reports and AI-written profiles that make every game part of a bigger story.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Phone Carousel */}
          <div className="relative">
            <div className="relative w-72 aspect-[9/19] mx-auto">
              <img 
                src={screens[activeSlide].image}
                alt={screens[activeSlide].alt}
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>

            {/* Carousel Navigation */}
            <div className="flex justify-center gap-3 mt-6">
              {screens.map((screen, index) => (
                <button
                  key={screen.id}
                  onClick={() => setActiveSlide(index)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeSlide === index
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {screen.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Feature Bullets */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-written player profiles</h3>
              <p className="text-gray-700 leading-relaxed">
                Capo watches your games, goals, wins, losses, streaks and form, and turns them into a living player bio. It updates every week. It remembers everything. It becomes the story of your kickabout career.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Streaks & form badges for banter</h3>
              <p className="text-gray-700 leading-relaxed">
                Attendance runs, scoring streaks, unbeaten patches, grim winless droughts — Capo tracks it all and shows your current "heat" with simple badges. Everyone knows who's flying and who's gone missing.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Fantasy-style scoring – but it's actually you</h3>
              <p className="text-gray-700 leading-relaxed">
                Every match feeds your season points: appearances, goals, wins, clean sheets, big results. Leaderboards shift every week. Suddenly, everyone checks where they stand.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Post-match voting — glory or shame</h3>
              <p className="text-gray-700 leading-relaxed">
                After every game, players can vote on what actually happened out there. Man of the Match. Donkey of the Day. Missing in Action.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Legends, records & lore</h3>
              <p className="text-gray-700 leading-relaxed">
                Biggest nights, longest streaks, wildest defeats, weird milestones — all logged. Your group stops being "just a chat" and starts to feel like it has history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForPlayers;
