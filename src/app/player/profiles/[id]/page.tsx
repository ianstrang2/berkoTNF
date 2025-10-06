'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import PlayerProfile from '@/components/player/PlayerProfile.component';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

export default function SpecificPlayerPage() {
  const params = useParams();
  const idFromParams = params?.id;
  const playerId = idFromParams ? Number(idFromParams) : undefined;

  const finalPlayerId = (playerId && !isNaN(playerId)) ? playerId : undefined;

  return (
    <div className="py-6 max-w-[1000px]">
      <ErrorBoundary>
        <PlayerProfile id={finalPlayerId} />
      </ErrorBoundary>
    </div>
  );
}
