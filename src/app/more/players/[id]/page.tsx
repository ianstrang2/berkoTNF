'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/layouts/MainLayout';
import PlayerProfile from '@/components/PlayerProfile';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function SpecificPlayerPage() {
  const params = useParams() || {};
  const playerId = Number(params.id) || 1;

  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <PlayerProfile id={playerId} />
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 