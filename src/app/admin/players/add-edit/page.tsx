'use client';
import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import PlayerForm from '@/components/admin/player/PlayerFormModal.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import PlayerManager from '@/components/admin/player/PlayerManager.component';

export default function AdminPlayerManagerPage() {
  return (
    <AdminLayout>
      <ErrorBoundary>
        <PlayerManager />
      </ErrorBoundary>
    </AdminLayout>
  );
} 