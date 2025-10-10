import { ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

