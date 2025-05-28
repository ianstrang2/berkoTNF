'use client';
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import PlayerProfile from '@/components/player/PlayerProfile.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function PlayerRecordsPage() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(1); // Default to first player
  
  return (
    <MainLayout>
      <div className="py-6">
        <ErrorBoundary>
          <PlayerProfile id={selectedPlayerId} />
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
} 