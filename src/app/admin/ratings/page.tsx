'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const PlayerRatings = dynamic(() => import('@/components/admin/PlayerRatings'), { ssr: false });

export default function PlayerRatingsPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <AdminLayout>
              <PlayerRatings />
            </AdminLayout>
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 