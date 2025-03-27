'use client';
import React, { useState } from 'react';
import CurrentHalfSeason from '@/components/CurrentHalfSeason';
import OverallSeasonPerformance from '@/components/OverallSeasonPerformance';
import AllTimeStats from '@/components/AllTimeStats';
import HonourRoll from '@/components/HonourRoll';
import PlayerProfile from '@/components/PlayerProfile';
import AdminPanel from '@/components/admin/AdminPanel';
import AdminLayout from '@/components/admin/AdminLayout';
import MatchReport from '@/components/MatchReport/MatchReport';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

export default function Home() {
  const [currentView, setCurrentView] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const handlePlayerProfileClick = (playerId) => {
    setSelectedPlayerId(playerId);
    setCurrentView('player-profiles');
  };

  const goHome = () => {
    setCurrentView('');
    setSelectedPlayerId(null);
  };

  const cards = [
    {
      title: 'Latest Match Report',
      description: 'View details from the most recent game',
      view: 'match-report',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      title: 'Current Half-Season',
      description: 'Check the ongoing season statistics',
      view: 'current-half',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      title: 'Performance by Season',
      description: 'Compare stats across different seasons',
      view: 'season',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'All-Time Leaderboard',
      description: 'View the all-time statistics leaders',
      view: 'all-time',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'Hall of Fame',
      description: 'Explore historic achievements',
      view: 'honour-roll',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      title: 'Player Profiles',
      description: 'Individual player statistics and history',
      view: 'player-profiles',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'Admin Section',
      description: 'Manage players and match data',
      view: 'admin',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <main className="min-h-screen">
      {!currentView ? (
        <div className="relative h-screen w-full overflow-hidden">
          {/* Splash Image */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/splash.jpg" 
              alt="Berko TNF Football" 
              className="w-full h-full object-cover"
            />
            {/* Overlay with gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-primary-900/30"></div>
          </div>

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col h-full justify-center items-center text-center p-4">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                Berko TNF
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow">
                Fantasy Football ... For Real
              </p>

              {/* Optional focus buttons */}
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={() => setCurrentView('match-report')}
                  variant="primary"
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                >
                  Latest Match
                </Button>
                <Button
                  onClick={() => setCurrentView('current-half')}
                  variant="outline"
                  size="lg"
                  className="text-white border-white hover:bg-white/20"
                >
                  Current Season
                </Button>
              </div>
            </div>

            {/* Credit text */}
            <div className="absolute bottom-4 right-4 text-xs text-white/60">
              Use the menu to navigate to all sections
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              onClick={goHome}
              variant="primary"
              size="md"
              className="mb-6"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              }
            >
              Back to Dashboard
            </Button>
            {currentView === 'match-report' && <MatchReport />}
            {currentView === 'current-half' && <CurrentHalfSeason />}
            {currentView === 'season' && <OverallSeasonPerformance />}
            {currentView === 'all-time' && <AllTimeStats />}
            {currentView === 'honour-roll' && <HonourRoll />}
            {currentView === 'player-profiles' && <PlayerProfile id={selectedPlayerId} />}
            {currentView === 'admin' && (
              <AdminLayout>
                <AdminPanel />
              </AdminLayout>
            )}
          </div>
        </div>
      )}
    </main>
  );
}