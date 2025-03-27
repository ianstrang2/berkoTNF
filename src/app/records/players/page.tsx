'use client';
import React, { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import PlayerProfile from '@/components/PlayerProfile';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function PlayersPage() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(1); // Default to first player
  
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <PlayerProfile id={selectedPlayerId} />
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 