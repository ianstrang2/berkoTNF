'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import AdminLayout from '@/components/admin/AdminLayout';
import dynamic from 'next/dynamic';

const MatchManager = dynamic(() => import('@/components/admin/MatchManager'), { ssr: false });

export default function AdminMatchesPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <AdminLayout>
              <MatchManager />
            </AdminLayout>
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 