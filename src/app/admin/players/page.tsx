'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui-kit';
import { AdminLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

const PlayerManager = dynamic(() => import('@/components/admin/player/PlayerManager.component'), { ssr: false });

export default function AdminPlayersPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to add-edit by default
    router.replace('/admin/players/add-edit');
  }, [router]);
  
  return null;
} 