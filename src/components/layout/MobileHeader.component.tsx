/**
 * Mobile Header Component (Capacitor Android/iOS)
 * 
 * Simplified header for native mobile apps
 * Different from web header - centered controls, no logout
 */

'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const MobileHeader: React.FC = () => {
  const pathname = usePathname() || '';
  const { profile } = useAuthContext();
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClientComponentClient();

  const isInAdminView = pathname.startsWith('/admin');
  const isInPlayerView = !isInAdminView && !pathname.startsWith('/superadmin');

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await supabase.auth.signOut();
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('userProfile');
      window.location.href = '/auth/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-tl from-purple-700 to-pink-500 border-b border-purple-700">
      <div className="flex items-center justify-center px-4 py-3 min-h-[56px]">
        {/* Superadmin: Not supported on mobile */}
        {profile.isSuperadmin ? (
          <div className="text-white text-sm text-center">
            <p>Superadmin features are web-only</p>
            <p className="text-xs opacity-80">Please use desktop browser</p>
          </div>
        ) : profile.isAuthenticated ? (
          // All authenticated users get contextual menu (centered)
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {/* Icon changes based on context */}
              {isInAdminView ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-sm font-semibold">Menu</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-semibold">Menu</span>
                </>
              )}
            </button>

            {/* Context-aware dropdown menu */}
            {showMenu && (
              <div className="absolute left-1/2 transform -translate-x-1/2 top-14 w-56 bg-white rounded-xl shadow-soft-xl border border-gray-200 py-2 z-50">
                {/* Admin-Player: Show view switching */}
                {profile.isAdmin && profile.linkedPlayerId && (
                  <>
                    {isInAdminView ? (
                      <a
                        href="/"
                        className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-gradient-to-tl hover:from-purple-50 hover:to-pink-50 transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span>View as Player</span>
                      </a>
                    ) : (
                      <a
                        href="/admin/matches"
                        className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-gradient-to-tl hover:from-purple-50 hover:to-pink-50 transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span>View as Admin</span>
                      </a>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}

                {/* Logout - available for everyone */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-gradient-to-tl hover:from-purple-50 hover:to-pink-50 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // Unauthenticated - show logo with login link
          <a href="/auth/login" className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <img 
                src="/img/logo.png" 
                alt="Capo Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white font-semibold text-lg ml-3">Capo</span>
          </a>
        )}
      </div>
    </header>
  );
};

