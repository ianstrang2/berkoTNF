/**
 * App Promo Modal Component
 * 
 * Shows app download prompt AFTER successful onboarding
 * - Web-only (hidden in Capacitor app)
 * - Dismissible with 30-day cooldown
 * - Shows on first web login post-onboarding
 */

'use client';

import { useState, useEffect } from 'react';
import { isInCapacitorApp } from '@/utils/platform-detection';

const AppPromoModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if in Capacitor app
    if (isInCapacitorApp()) {
      return;
    }

    // Check if user has dismissed or seen modal recently
    const dismissed = localStorage.getItem('appPromoModalDismissed');
    
    if (!dismissed) {
      // Never seen before - show it once
      setTimeout(() => setIsVisible(true), 1000);
      return;
    }
    
    // Check if dismissed more than 30 days ago
    const dismissedAt = parseInt(dismissed);
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    if ((now - dismissedAt) > thirtyDays) {
      // Been more than 30 days - show again
      setTimeout(() => setIsVisible(true), 1000);
    }
    // Otherwise, stay hidden (dismissed recently)
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('appPromoModalDismissed', Date.now().toString());
    setIsVisible(false);
  };

  const handleDownload = () => {
    // Deep link attempt (opens app if installed)
    window.location.href = 'capo://dashboard';
    
    // Fallback to Play Store after delay
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.caposport.capo';
    }, 1500);
    
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              You're all set!
            </h2>
            <p className="text-gray-600">
              Get the full experience with the Capo app
            </p>
          </div>

          {/* Benefits List */}
          <div className="border border-slate-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Instant access to:</h3>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Priority match notifications</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Easily RSVP to matches</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Your profile and fantasy points</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Leaderboards and match reports</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-amber-800 text-center">
              <strong>Web-only users:</strong> You may miss match notifications and RSVP alerts
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Download the Capo App
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full py-2 px-4 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
            >
              Continue on Web
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppPromoModal;

