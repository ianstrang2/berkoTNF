'use client';

import { ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import { AuthGuard } from '@/components/auth/AuthGuard.component';

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="superadmin">
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}
