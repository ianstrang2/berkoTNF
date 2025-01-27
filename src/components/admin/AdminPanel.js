'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const PlayerManager = dynamic(() => import('@/components/admin/PlayerManager'), { ssr: false });
const MatchManager = dynamic(() => import('@/components/admin/MatchManager'), { ssr: false });

const AdminPanel = () => {
  const [currentSection, setCurrentSection] = useState(null);

  return (
    <div className="p-6">
      {!currentSection ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setCurrentSection('players')}
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-blue-500 hover:to-green-500 transition-all"
            >
              <h2 className="text-xl font-semibold">Add or Amend Players</h2>
            </div>
            <div
              onClick={() => setCurrentSection('matches')}
              className="p-6 rounded-lg shadow cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-pink-500 hover:to-purple-500 transition-all"
            >
              <h2 className="text-xl font-semibold">Enter Match Information</h2>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCurrentSection(null)}
            className="mb-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-blue-500 transition-all"
          >
            Back to Admin Menu
          </button>
          {/* No Suspense wrapper needed here */}
          {currentSection === 'players' && <PlayerManager />}
          {currentSection === 'matches' && <MatchManager />}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
