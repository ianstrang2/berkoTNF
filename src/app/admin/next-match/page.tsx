'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const TeamAlgorithm = dynamic(() => import('@/components/admin/team/TeamAlgorithmWrapper.component'), { ssr: false });

export default function NextMatchPage() {
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