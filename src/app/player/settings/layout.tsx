import MainLayout from '@/components/layout/MainLayout.layout';
import { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

