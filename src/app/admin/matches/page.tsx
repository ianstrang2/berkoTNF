'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import MatchManagementPage from '@/components/admin/matches/MatchManager.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
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