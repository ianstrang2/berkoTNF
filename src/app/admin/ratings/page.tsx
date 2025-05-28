'use client';
import React from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import dynamic from 'next/dynamic';

const PlayerRatings = dynamic(() => import('@/components/admin/player/PlayerRatings.component'), {
  ssr: false,
  loading: () => <p>Loading ratings...</p>
});

export default function RatingsPage() {
  return (
    <MainLayout>
      <AdminLayout>
        <ErrorBoundary>
          <PlayerRatings />
        </ErrorBoundary>
      </AdminLayout>
    </MainLayout>
  );
} 