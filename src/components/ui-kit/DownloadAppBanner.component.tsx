/**
 * Download App Banner Component
 * 
 * Shows app download prompt for web users (hidden in Capacitor app)
 * Encourages users to download native app for push notifications
 */

'use client';

import { useState, useEffect } from 'react';
import { isInCapacitorApp } from '@/utils/platform-detection';

const DownloadAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if in Capacitor app
    if (isInCapacitorApp()) {
      return;
    }

    // Check if user has dismissed banner
    const dismissed = localStorage.getItem('dismissedAppBanner');
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Show banner if not dismissed or dismissed more than 30 days ago
    if (!dismissed || (now - dismissedAt) > thirtyDays) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('dismissedAppBanner', Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-purple-700 to-pink-500 text-white px-4 py-3 rounded-lg shadow-lg mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2">📱</span>
            <h3 className="font-semibold">Download our app for a better experience</h3>
          </div>
          <p className="text-sm text-white/90 mb-3">
            Get push notifications for matches, RSVPs, and updates
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Play Store Badge */}
            <a
              href="https://play.google.com/store/apps/details?id=com.capo.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 1 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Play Store
            </a>
            
            {/* App Store Badge (when available) */}
            <a
              href="#"
              className="inline-flex items-center px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
              </svg>
              App Store
            </a>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="ml-4 text-white/80 hover:text-white transition-colors p-1"
          aria-label="Dismiss banner"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DownloadAppBanner;

