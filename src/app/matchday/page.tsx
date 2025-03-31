'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import dynamic from 'next/dynamic';

// Dynamically import the Matchday component
const Matchday = dynamic(() => import('@/components/matchday/Matchday'), {
  loading: () => (
    <div className="flex justify-center items-center p-12">
      <div className="w-12 h-12 border-4 border-neutral-300 border-t-primary-500 rounded-full animate-spin"></div>
    </div>
  ),
});

export default function MatchdayPage() {
  return (
    <MainLayout>
      <div className="py-6">
        <Matchday />
      </div>
    </MainLayout>
  );
} 