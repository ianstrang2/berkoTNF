'use client';
import React from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import dynamic from 'next/dynamic';

const TeamAlgorithm = dynamic(() => import('@/components/admin/team/TeamAlgorithmWrapper.component'), { ssr: false });

export default function NextMatchAdminPage() {
  return (
    <MainLayout>
      <ErrorBoundary>
        <AdminLayout>
          <TeamAlgorithm />
        </AdminLayout>
      </ErrorBoundary>
    </MainLayout>
  );
} 