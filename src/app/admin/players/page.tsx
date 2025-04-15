'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const PlayerManager = dynamic(() => import('@/components/admin/player/PlayerManager.component'), { ssr: false });

export default function AdminPlayersPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <ErrorBoundary>
          <AdminLayout>
            <PlayerManager />
          </AdminLayout>
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
} 