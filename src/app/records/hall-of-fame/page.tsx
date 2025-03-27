'use client';
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import HonourRoll from '@/components/HonourRoll';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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