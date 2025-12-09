'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Redirect from old /player/stats/all-time/legends to new /player/stats/legends
export default function AllTimeLegendsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const view = searchParams?.get('view') || 'winners';
    router.replace(`/player/stats/legends/${view}`);
  }, [router, searchParams]);
  
  return null;
}
