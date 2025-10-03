/**
 * Profile Dropdown Component
 * 
 * Context-aware menu in header (Desktop/Mobile Web only, not Capacitor)
 * Shows different options based on user role and current view
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || '';
  const router = useRouter();
  const { profile } = useAuthContext();
  const supabase = createClientComponentClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await supabase.auth.signOut();
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('userProfile');
      window.location.href = '/auth/login';
    }
  };

  const switchToView = async (view: 'admin' | 'player' | 'platform') => {
    setSwitching(true);
    
    if (view === 'admin') {
      window.location.href = '/admin/matches';
    } else if (view === 'player') {
      window.location.href = '/';
    } else if (view === 'platform') {
      // Superadmin return to platform
      const response = await fetch('/api/auth/superadmin/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: null }),
      });
      if ((await response.json()).success) {
        window.location.href = '/superadmin/tenants';
      }
    }
  };

  const isInAdminView = pathname.startsWith('/admin');
  const isInSuperadminView = pathname.startsWith('/superadmin');
  const isInPlayerView = !isInAdminView && !isInSuperadminView;

  // Don't show on auth pages
  if (pathname.startsWith('/auth') || pathname.startsWith('/join')) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        aria-label="Profile menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-slate-700">{profile.displayName || 'User'}</p>
            {profile.isAdmin && profile.isSuperadmin && (
              <p className="text-xs text-slate-500">Superadmin</p>
            )}
            {profile.isAdmin && !profile.isSuperadmin && profile.linkedPlayerId && (
              <p className="text-xs text-slate-500">Admin • Player</p>
            )}
            {profile.isAdmin && !profile.isSuperadmin && !profile.linkedPlayerId && (
              <p className="text-xs text-slate-500">Admin</p>
            )}
            {!profile.isAdmin && (
              <p className="text-xs text-slate-500">Player</p>
            )}
          </div>

          {/* Superadmin View Options */}
          {profile.isSuperadmin && (
            <>
              <button
                onClick={() => switchToView('platform')}
                disabled={switching || isInSuperadminView}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                  isInSuperadminView
                    ? 'bg-gradient-to-tl from-purple-100 to-pink-100 text-purple-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span>Platform View</span>
              </button>
              <button
                onClick={() => switchToView('admin')}
                disabled={switching || isInAdminView}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                  isInAdminView
                    ? 'bg-gradient-to-tl from-purple-100 to-pink-100 text-purple-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span>View as Admin</span>
              </button>
              <button
                onClick={() => switchToView('player')}
                disabled={switching || isInPlayerView}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                  isInPlayerView
                    ? 'bg-gradient-to-tl from-purple-100 to-pink-100 text-purple-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span>View as Player</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
            </>
          )}

          {/* Admin-Player View Switching */}
          {!profile.isSuperadmin && profile.isAdmin && profile.linkedPlayerId && (
            <>
              {isInAdminView ? (
                <button
                  onClick={() => switchToView('player')}
                  disabled={switching}
                  className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-gradient-to-tl hover:from-purple-50 hover:to-pink-50 transition-colors disabled:opacity-50 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span>View as Player</span>
                </button>
              ) : (
                <button
                  onClick={() => switchToView('admin')}
                  disabled={switching}
                  className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-gradient-to-tl hover:from-purple-50 hover:to-pink-50 transition-colors disabled:opacity-50 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>View as Admin</span>
                </button>
              )}
              <div className="border-t border-gray-100 my-1"></div>
            </>
          )}

          {/* Logout */}
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
  );
};

