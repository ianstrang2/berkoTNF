'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

// Dynamically import the Dashboard component
const Dashboard = dynamic(() => import('@/components/dashboard/Dashboard.component'), {
  loading: () => (
    <div className="flex justify-center items-center p-12">
      <div className="w-12 h-12 border-4 border-neutral-300 border-t-primary-500 rounded-full animate-spin"></div>
    </div>
  ),
});

export default function Home() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
} 