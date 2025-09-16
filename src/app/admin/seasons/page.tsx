'use client';
import React from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import SeasonManager from '@/components/admin/season/SeasonManager.component';

export default function AdminSeasonsPage() {
  return (
    <MainLayout>
      <AdminLayout>
        <ErrorBoundary>
          <SeasonManager />
        </ErrorBoundary>
      </AdminLayout>
    </MainLayout>
  );
}
