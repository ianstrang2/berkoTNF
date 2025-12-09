import MainLayout from '@/components/layout/MainLayout.layout';
import { ReactNode } from 'react';

export default function StatsLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

