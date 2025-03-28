'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';

export default function RecordsPage() {
  const items = [
    {
      title: 'Player Records',
      description: 'View individual player achievements and milestones',
      href: '/records/players',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: 'All-Time Stats',
      description: 'Club statistics and records across all seasons',
      href: '/records/all-time',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Hall of Fame',
      description: 'Honoring the club\'s greatest players and achievements',
      href: '/records/hall-of-fame',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    }
  ];

  return (
    <MainLayout>
      <div className="py-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Club Records</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <Link key={i} href={item.href} className="block">
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full flex flex-col items-center text-center p-6">
                <div className="bg-primary-50 p-4 rounded-full mb-4">
                  <div className="text-primary-600">
                    {item.icon}
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  {item.title}
                </h2>
                <p className="text-neutral-600 text-sm">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
} 