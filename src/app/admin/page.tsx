'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function AdminRedirectPage() {
  useEffect(() => {
    redirect('/admin/next-match');
  }, []);
  
  // This return is just a fallback while the redirect happens
  return null;
}