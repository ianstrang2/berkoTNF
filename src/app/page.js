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
import styles from './page.module.css';

console.log('Type of AdminLayout:', typeof AdminLayout);
console.log('AdminPanel:', AdminPanel);
console.log('AdminLayout:', AdminLayout);

export default function Home() {
  const [currentView, setCurrentView] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const handlePlayerProfileClick = (playerId) => {
    console.log('Setting selected player ID:', playerId); // Debugging
    setSelectedPlayerId(playerId);
    setCurrentView('player-profiles');
  };

  const goHome = () => {
    setCurrentView('');
    setSelectedPlayerId(null); // Reset selected player ID when going back home
  };

  console.log('Current view:', currentView); // Debugging
  console.log('Selected player ID:', selectedPlayerId); // Debugging

  return (
    <main className={styles.arcadeBackground}>
      {!currentView ? (
        <div>
          <h1 className={styles.arcadeTitle}>TNF Stats Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              className={`${styles.arcadeCard} ${styles.matchReport}`}
              onClick={() => setCurrentView('match-report')}
            >
              <h2 className={styles.arcadeCardTitle}>Latest Match Report</h2>
            </div>
            <div 
              className={`${styles.arcadeCard} ${styles.currentHalf}`}
              onClick={() => setCurrentView('current-half')}
            >
              <h2 className={styles.arcadeCardTitle}>Current Half-Season</h2>
            </div>
            <div 
              className={`${styles.arcadeCard} ${styles.season}`}
              onClick={() => setCurrentView('season')}
            >
              <h2 className={styles.arcadeCardTitle}>Performance by Season</h2>
            </div>
            <div 
              className={`${styles.arcadeCard} ${styles.allTime}`}
              onClick={() => setCurrentView('all-time')}
            >
              <h2 className={styles.arcadeCardTitle}>All-Time Leaderboard</h2>
            </div>
            <div 
              className={`${styles.arcadeCard} ${styles.honourRoll}`}
              onClick={() => setCurrentView('honour-roll')}
            >
              <h2 className={styles.arcadeCardTitle}>Hall of Fame</h2>
            </div>
            <div 
              className={`${styles.arcadeCard} ${styles.profiles}`}
              onClick={() => handlePlayerProfileClick(1)}
            >
              <h2 className={styles.arcadeCardTitle}>Player Profiles</h2>
            </div>
            <div 
              className={`${styles.arcadeCard} ${styles.admin}`}
              onClick={() => setCurrentView('admin')}
            >
              <h2 className={styles.arcadeCardTitle}>Admin Section</h2>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={goHome}
            className={styles.arcadeButton}
          >
            Back to Home
          </button>
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
        </>
      )}
    </main>
  );
}