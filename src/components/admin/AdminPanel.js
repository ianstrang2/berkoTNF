'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const TeamAlgorithm = dynamic(() => import('@/components/admin/TeamAlgorithm'), { ssr: false });
const PlayerRatings = dynamic(() => import('@/components/admin/PlayerRatings'), { ssr: false });
const PlayerManager = dynamic(() => import('@/components/admin/PlayerManager'), { ssr: false });
const MatchManager = dynamic(() => import('@/components/admin/MatchManager'), { ssr: false });
const AppSetup = dynamic(() => import('@/components/admin/AppSetup'), { ssr: false });

const ProtectedAppSetup = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const superAdminAuth = localStorage.getItem('superAdminAuth');
    if (superAdminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'wee') {
      localStorage.setItem('superAdminAuth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full">
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-center text-error-600">App Setup Access</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-error-500 focus:border-error-500 transition-colors"
              />
            </div>
            {error && (
              <p className="text-error-500 text-sm font-medium text-center">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-error-600 hover:bg-error-700 text-white"
            >
              Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return <AppSetup />;
};

const AdminPanel = () => {
  const [currentSection, setCurrentSection] = useState(null);
  
  const adminItems = [
    {
      title: 'Next Match Management',
      description: 'Organise and balance teams for the next game',
      section: 'algorithm',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
        </svg>
      )
    },
    {
      title: 'Player Ratings',
      description: 'Update player attributes',
      section: 'ratings',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    {
      title: 'Player Management',
      description: 'Add, edit and manage players',
      section: 'players',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      title: 'Match Records',
      description: 'Enter and manage match information',
      section: 'matches',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'App Setup',
      description: 'Configure app settings and team templates',
      section: 'appsetup',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!currentSection ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {adminItems.map((item, index) => (
            <div 
              key={index}
              onClick={() => setCurrentSection(item.section)}
              className="bg-white rounded-xl shadow-card p-6 hover:shadow-elevated transition-shadow duration-200 cursor-pointer h-full flex flex-col items-center text-center"
            >
              <div className={`${item.section === 'appsetup' ? 'bg-error-50' : 'bg-primary-50'} p-4 rounded-full mb-4`}>
                <div className={`${item.section === 'appsetup' ? 'text-error-600' : 'text-primary-600'}`}>
                  {item.icon}
                </div>
              </div>
              <h2 className={`text-xl font-semibold text-neutral-900 mb-2 ${item.section === 'appsetup' ? 'text-error-700' : ''}`}>
                {item.title}
              </h2>
              <p className="text-neutral-600 text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6 flex items-center">
            <Button
              onClick={() => setCurrentSection(null)}
              variant="primary"
              className="text-white bg-primary-500 hover:bg-primary-600"
              icon={
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              }
            >
              Back
            </Button>
            <h1 className="text-2xl font-bold text-primary-600 ml-4">
              {adminItems.find(item => item.section === currentSection)?.title}
            </h1>
          </div>
          <div className="bg-white rounded-xl shadow-card p-6">
            {currentSection === 'algorithm' && <TeamAlgorithm />}
            {currentSection === 'ratings' && <PlayerRatings />}
            {currentSection === 'players' && <PlayerManager />}
            {currentSection === 'matches' && <MatchManager />}
            {currentSection === 'appsetup' && <ProtectedAppSetup />}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
