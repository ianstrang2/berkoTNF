'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import { HonourRoll } from '@/components/records';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function HallOfFamePage() {
  return (
    <MainLayout>
      <div className="py-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <ErrorBoundary>
            <HonourRoll />
          </ErrorBoundary>
        </div>
      </div>
    </MainLayout>
  );
} 