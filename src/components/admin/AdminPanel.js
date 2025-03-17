'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const PlayerManager = dynamic(() => import('@/components/admin/PlayerManager'), { ssr: false });
const MatchManager = dynamic(() => import('@/components/admin/MatchManager'), { ssr: false });

const AdminPanel = () => {
  const [currentSection, setCurrentSection] = useState(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!currentSection ? (
        <div>
          <h1 className="text-3xl font-bold text-center text-primary-600 mb-8">Admin Panel</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => setCurrentSection('players')}
              className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 group"
            >
              <h2 className="text-xl font-semibold text-primary-600 group-hover:text-primary-700">
                Add or Amend Players
              </h2>
            </div>
            <div
              onClick={() => setCurrentSection('matches')}
              className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 group"
            >
              <h2 className="text-xl font-semibold text-primary-600 group-hover:text-primary-700">
                Enter Match Information
              </h2>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCurrentSection(null)}
            className="mb-6 px-4 py-2 text-sm font-medium rounded-md bg-white text-primary-600 border border-primary-200 hover:bg-primary-50 transition-colors duration-200"
          >
            Back to Admin Menu
          </button>
          {currentSection === 'players' && <PlayerManager />}
          {currentSection === 'matches' && <MatchManager />}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
