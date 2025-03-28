'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';
import Link from 'next/link';

export default function Home() {
  return (
    <MainLayout>
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
        {/* Splash Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/splash.webp" 
            alt="Berko TNF Football" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 h-full p-8 md:p-12">
          <div className="mt-8 md:mt-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-600 drop-shadow-[0_2px_4px_rgba(255,255,255,0.5)] text-left">
              Berko TNF
            </h1>
          </div>
        </div>
      </div>
      
      <footer className="py-4 bg-white border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-neutral-500">
            © {new Date().getFullYear()} ScoreDraw. All rights reserved.
          </p>
        </div>
      </footer>
    </MainLayout>
  );
} 