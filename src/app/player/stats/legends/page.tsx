'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegendsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/player/stats/legends/winners');
  }, [router]);
  
  return null;
}

