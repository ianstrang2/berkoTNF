'use client';
import React from 'react';
import LegendsComponent from '@/components/records/Legends.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function LegendsScorersPage() {
  return (
    <ErrorBoundary>
      <LegendsComponent initialView="scorers" />
    </ErrorBoundary>
  );
}

