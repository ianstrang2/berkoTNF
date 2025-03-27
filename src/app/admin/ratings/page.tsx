'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import AdminLayout from '@/components/admin/AdminLayout';
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