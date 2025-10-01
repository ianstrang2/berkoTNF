/**
 * Mobile Header Component (Capacitor Android/iOS)
 * 
 * Simplified header for native mobile apps
 * Different from web header - centered controls, no logout
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export const MobileHeader: React.FC = () => {
  const pathname = usePathname() || '';
  const { profile } = useAuthContext();

  const isInAdminView = pathname.startsWith('/admin');
  const isInPlayerView = !isInAdminView && !pathname.startsWith('/superadmin');

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-tl from-purple-700 to-pink-500 border-b border-purple-700">
      <div className="flex items-center justify-center px-4 py-3 min-h-[56px]">
        {/* Superadmin: Not supported on mobile */}
        {profile.isSuperadmin ? (
          <div className="text-white text-sm text-center">
            <p>Superadmin features are web-only</p>
            <p className="text-xs opacity-80">Please use desktop browser</p>
          </div>
        ) : profile.isAdmin && profile.linkedPlayerId ? (
          // Admin with linked player - show role switcher (centered)
          isInAdminView ? (
            <a
              href="/"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <span>👤</span>
              <span>View as Player</span>
            </a>
          ) : (
            <a
              href="/admin/matches"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <span>⚙️</span>
              <span>Back to Admin</span>
            </a>
          )
        ) : (
          // Regular player or admin without player link - show logo centered
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <img 
                src="/img/logo.png" 
                alt="Capo Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white font-semibold text-lg ml-3">Capo</span>
          </div>
        )}
      </div>
    </header>
  );
};

