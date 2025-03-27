'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import AdminLayout from '@/components/admin/AdminLayout';
import dynamic from 'next/dynamic';

const AppSetup = dynamic(() => import('@/components/admin/AppSetup'), { ssr: false });

export default function AdminSetupPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <AdminLayout>
              <AppSetup />
            </AdminLayout>
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 