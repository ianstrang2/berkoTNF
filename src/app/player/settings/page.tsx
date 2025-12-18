'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to profile by default (same pattern as /player/table)
    router.replace('/player/settings/profile');
  }, [router]);
  
  return null;
}




