'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Redirect from old /player/stats/whole to new /player/stats/season
export default function StatsWholeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const view = searchParams?.get('view');
    const newUrl = view ? `/player/stats/season?view=${view}` : '/player/stats/season';
    router.replace(newUrl);
  }, [router, searchParams]);
  
  return null;
}
