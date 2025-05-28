'use client';
import React from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import PlayerRatings from '@/components/admin/player/PlayerRatings.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function AdminPlayerRatingsPage() {
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