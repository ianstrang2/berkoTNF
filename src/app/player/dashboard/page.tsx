'use client';
import React from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout.layout';
import dynamic from 'next/dynamic';
import Dashboard from '@/components/dashboard/Dashboard.component';

// Dynamically import the Dashboard component
const DashboardComponent = dynamic(() => import('@/components/dashboard/Dashboard.component'), {
  loading: () => (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  ),
  ssr: false, // Ensure it's client-side rendered if it uses client-specific hooks or state
});

export default function HomePage() {
  return (
    <MainLayout>
      <Head>
        <title>Dashboard - Capo</title>
        <meta name="description" content="Overview of your Capo stats and upcoming matches." />
      </Head>
      <DashboardComponent />
    </MainLayout>
  );
}
