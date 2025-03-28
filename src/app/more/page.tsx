'use client';
import React from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';

export default function MorePage() {
  const items = [
    {
      title: 'Players',
      description: 'View individual player profiles and statistics',
      href: '/more/players',
    },
    {
      title: 'All-Time Leaderboard',
      description: 'Check the all-time statistics leaders',
      href: '/more/all-time',
    },
    {
      title: 'Hall of Fame',
      description: 'View record holders and major achievements',
      href: '/more/hall-of-fame',
    }
  ];

  return (
    <MainLayout>
      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6 text-center">More Options</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <Link key={index} href={item.href} className="block">
              <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 h-full flex flex-col items-center text-center">
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