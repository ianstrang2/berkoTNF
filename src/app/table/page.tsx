'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TablePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to half season by default
    router.replace('/table/half');
  }, [router]);
  
  return null;
} 