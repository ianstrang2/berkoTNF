'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';
import MainLayout from '@/components/layout/MainLayout.layout';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import PlayerManagementPage from '@/components/admin/player/PlayerManager.component';
import Link from 'next/link';

export default function PlayerAdminPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to add-edit by default
    router.replace('/admin/players/add-edit');
  }, [router]);
  
  return null;
} 