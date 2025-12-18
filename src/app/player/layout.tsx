'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard.component';

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="player">
      {children}
    </AuthGuard>
  );
}
