'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { LeaderboardStats } from '@/components/stats';

export default function AllTimeStatsPage() {
  return (
    <MainLayout>
      <LeaderboardStats />
    </MainLayout>
  );
} 