'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const MatchManager = dynamic(() => import('@/components/admin/matches/MatchManager.component'), { ssr: false });

export default function AdminMatchesPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to next match by default
    router.replace('/admin/matches/next');
  }, [router]);
  
  return null;
} 