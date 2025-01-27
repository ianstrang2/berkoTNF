'use client';
import React, { useState } from 'react';
import CurrentHalfSeason from '@/components/CurrentHalfSeason';
import OverallSeasonPerformance from '@/components/OverallSeasonPerformance';
import AllTimeStats from '@/components/AllTimeStats';
import HonourRoll from '@/components/HonourRoll';
import PlayerProfile from '@/components/PlayerProfile';
import AdminPanel from '@/components/admin/AdminPanel';
import AdminLayout from '@/components/admin/AdminLayout';

console.log('Type of AdminLayout:', typeof AdminLayout);
console.log('AdminPanel:', AdminPanel);
console.log('AdminLayout:', AdminLayout);

export default function Home() {
  const [currentView, setCurrentView] = useState('current-half');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const goHome = () => {
    setCurrentView('');
    setSelectedPlayerId(null); // Reset selected player ID when going back home
  };

  const handlePlayerProfileClick = (playerId) => {
    console.log('Setting selected player ID:', playerId); // Debugging
    setSelectedPlayerId(playerId);
    setCurrentView('player-profiles');
  };

  console.log('Current view:', currentView); // Debugging
  console.log('Selected player ID:', selectedPlayerId); // Debugging

  return (
    <main>
      {!currentView ? (
        <div className="flex min-h-screen flex-col items-center p-24">
          <h1 className="text-4xl font-bold mb-6">Berko TNF Stats</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:from-yellow-500 hover:to-pink-500 transition-all"
              onClick={() => setCurrentView('current-half')}
            >
              <h2 className="text-xl font-semibold">Current Half-Season</h2>
            </div>
            <div 
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-purple-600 hover:to-blue-500 transition-all"
              onClick={() => setCurrentView('season')}
            >
              <h2 className="text-xl font-semibold">Performance by Season</h2>
            </div>
            <div 
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-purple-600 hover:to-blue-500 transition-all"
              onClick={() => setCurrentView('all-time')}
            >
              <h2 className="text-xl font-semibold">All-Time Leaderboard</h2>
            </div>
            <div 
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-purple-600 hover:to-blue-500 transition-all"
              onClick={() => setCurrentView('honour-roll')}
            >
              <h2 className="text-xl font-semibold">Hall of Fame</h2>
            </div>
            <div 
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-purple-600 hover:to-blue-500 transition-all"
              onClick={() => handlePlayerProfileClick(1)} // Pass the player ID here
            >
              <h2 className="text-xl font-semibold">Individual Player Profiles</h2>
            </div>
            <div 
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-blue-500 hover:to-green-500 transition-all"
              onClick={() => setCurrentView('admin')}
            >
              <h2 className="text-xl font-semibold">Admin Section</h2>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={goHome}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-md hover:from-purple-600 hover:to-blue-500 transition-all"
          >
            Back to Home
          </button>
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
        </>
      )}
    </main>
  );
}