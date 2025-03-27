'use client';
import React from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layouts/MainLayout';
import Card from '@/components/ui/card';

export default function RecordsPage() {
  const items = [
    {
      title: 'Players',
      description: 'View individual player profiles and statistics',
      href: '/records/players',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: 'All-Time Leaderboard',
      description: 'Check the all-time statistics leaders',
      href: '/records/all-time',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Hall of Fame',
      description: 'View record holders and major achievements',
      href: '/records/hall-of-fame',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    }
  ];

  return (
    <MainLayout>
      <div className="py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <Link key={index} href={item.href} className="block">
              <div className="bg-white rounded-xl shadow-card p-6 hover:shadow-elevated transition-shadow duration-200 h-full flex flex-col items-center text-center">
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