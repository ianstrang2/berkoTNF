'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const TeamAlgorithm = dynamic(() => import('@/components/admin/team/TeamAlgorithm.component'), { ssr: false });

export default function NextMatchPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <ErrorBoundary>
          <AdminLayout>
            <TeamAlgorithm />
          </AdminLayout>
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
} 