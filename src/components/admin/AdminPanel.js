'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './AdminPanel.module.css';

const PlayerManager = dynamic(() => import('@/components/admin/PlayerManager'), { ssr: false });
const MatchManager = dynamic(() => import('@/components/admin/MatchManager'), { ssr: false });

const AdminPanel = () => {
  const [currentSection, setCurrentSection] = useState(null);

  return (
    <div className={styles.adminContainer}>
      {!currentSection ? (
        <div>
          <h1 className={styles.adminTitle}>Admin Panel</h1>
          <div className={styles.cardGrid}>
            <div
              onClick={() => setCurrentSection('players')}
              className={styles.adminCard}
            >
              <h2>Add or Amend Players</h2>
            </div>
            <div
              onClick={() => setCurrentSection('matches')}
              className={`${styles.adminCard} ${styles.matchesCard}`}
            >
              <h2>Enter Match Information</h2>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCurrentSection(null)}
            className={styles.backButton}
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
