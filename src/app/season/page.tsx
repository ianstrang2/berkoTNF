'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function SeasonRedirectPage() {
  useEffect(() => {
    redirect('/season/half-season');
  }, []);
  
  // This return is just a fallback while the redirect happens
  return null;
} 