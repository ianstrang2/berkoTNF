'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecordsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to leaderboard by default
    router.replace('/player/records/leaderboard');
  }, [router]);
  
  return null;
}
