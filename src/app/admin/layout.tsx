'use client';

import { ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import { AuthGuard } from '@/components/auth/AuthGuard.component';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="admin">
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}
