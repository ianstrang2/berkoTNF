'use client';
import React from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import ImageCarousel from './ImageCarousel.component';

const ForPlayers: React.FC = () => {
  const sectionRef = useScrollReveal();

  // Player profile carousel images
  const playerProfileImages = [
    {
      src: '/img/marketing/player-profile/2-player-profile.png',
      alt: 'Capo football stats app interface showing streaks, goals and 5-a-side performance charts',
      caption: 'AI-written biography that tells your football story'
    },
    {
      src: '/img/marketing/player-profile/1-match-report.png',
      alt: 'Capo 5-a-side football app showing player stats and match report',
      caption: 'Post-match reports showing streaks, form, and performance'
    },
    {
      src: '/img/marketing/player-profile/3-season-race.png',
      alt: 'Capo 5-a-side football app weekly match flow showing season race progression',
      caption: 'Track your rise through the season leaderboard'
    },
    {
      src: '/img/marketing/player-profile/6-league-tables.png',
      alt: 'Capo football stats app showing league tables and season standings',
      caption: 'Half-season and full-season standings with points and performance'
    },
    {
      src: '/img/marketing/player-profile/4-chemistry.png',
      alt: 'Capo 5-a-side performance charts showing player chemistry and partnerships',
      caption: 'Who you play best with - the data proves it'
    },
    {
      src: '/img/marketing/player-profile/5-records.png',
      alt: 'Capo football stats app showing club records, milestones, and achievements',
      caption: 'All-time records, milestones, and club legends'
    },
  ];

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-white scroll-reveal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
            FOR PLAYERS
          </h2>
          <h3 className="text-2xl md:text-3xl font-semibold text-neutral-700">
            Your football story, told properly.
          </h3>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-lg md:text-xl text-neutral-700 leading-relaxed text-center">
            Capo turns your casual football game into a proper mini-league — the kind people actually care about.
            Every match counts. Every stat matters. Every streak becomes lore. It's the football stats app for casual players — a proper 5-a-side stats tracker that finally treats your weeknight games like they matter.
          </p>
        </div>

        {/* Image Carousel */}
        <div className="mb-16">
          <ImageCarousel images={playerProfileImages} autoPlayInterval={5000} accentColor="purple" />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Your AI-written player biography
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Capo watches your performances — games, goals, wins, losses, scoring runs, attendance, form, seasons — and turns them into a living football narrative. It updates as you play. It remembers everything. It becomes the story of your career at the club.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Streaks & form that actually feel like form
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Attendance runs. Unbeaten patches. Win streaks. Scoring streaks. Winless droughts. Capo tracks them all and shows your current heat with bold icons and simple visuals. You know exactly who's on fire and who's gone missing.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Fantasy-style scoring — but from real football
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Every game feeds your season points: goals, assists, appearance points, win bonuses, clean sheet bonuses, streak multipliers and heavy-win rewards. Leaderboards shift every week. Suddenly everyone starts checking where they stand.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Performance graphs that show your rise (or wobble)
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Your games, goals, minutes and points-per-game evolve across the season in clean, simple visuals. You can see your improvement — and everyone else's.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Chemistry that exposes the truth
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Capo reveals who you play best with, who you struggle with, and which combinations always deliver. Some partnerships just click. Some… don't. Now you've got the data to prove it.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Records, milestones & club legends
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Longest streaks, biggest scoring nights, heaviest defeats, milestone matches. Capo keeps the folklore straight. Your group stops being "just a chat" and starts to feel like it has real history.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForPlayers;

