'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const MatchManager = dynamic(() => import('@/components/admin/matches/MatchManager.component'), { ssr: false });

export default function AdminMatchesPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <ErrorBoundary>
          <AdminLayout>
            <MatchManager />
          </AdminLayout>
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
} 