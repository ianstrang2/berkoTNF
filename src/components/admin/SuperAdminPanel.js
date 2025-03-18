import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const PlayerManager = dynamic(() => import('@/components/admin/PlayerManager'), { ssr: false });
const MatchManager = dynamic(() => import('@/components/admin/MatchManager'), { ssr: false });

const SuperAdminPanel = () => {
  const [currentSection, setCurrentSection] = useState(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!currentSection ? (
        <div>
          <h1 className="text-4xl font-bold text-center text-primary-600 mb-8">
            Super Admin Dashboard
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => setCurrentSection('players')}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-100 transition-colors duration-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors duration-200">
                  Player Management
                </h2>
                <p className="text-gray-600">
                  Add new players or update existing player information
                </p>
              </div>
            </div>

            <div
              onClick={() => setCurrentSection('matches')}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-100 transition-colors duration-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors duration-200">
                  Match Records
                </h2>
                <p className="text-gray-600">
                  Record match results and player performances
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCurrentSection(null)}
            className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Super Admin Dashboard
          </button>
          {currentSection === 'players' && <PlayerManager />}
          {currentSection === 'matches' && <MatchManager />}
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel; 