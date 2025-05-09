'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const PlayerRatings = dynamic(() => import('@/components/admin/player/PlayerRatings.component'), { ssr: false });

export default function PlayerRatingsPage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <AdminLayout>
          <PlayerRatings />
        </AdminLayout>
      </ErrorBoundary>
    </MainLayout>
  );
} 