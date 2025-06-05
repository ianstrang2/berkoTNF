'use client';
import React, { useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

interface AdminModeToggleProps {
  className?: string;
}

export const AdminModeToggle: React.FC<AdminModeToggleProps> = ({ className = '' }) => {
  const { isAdminMode, isAdminAuthenticated, toggleAdminMode, setIsAdminAuthenticated } = useNavigation();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [password, setPassword] = useState('');

  const handleToggleClick = () => {
    if (isAdminAuthenticated) {
      // Already authenticated, just toggle mode
      toggleAdminMode();
    } else {
      // Not authenticated, show auth prompt
      setShowAuthPrompt(true);
    }
  };

  const handleAuthenticate = () => {
    // Simple password check (in real app, this would be more secure)
    if (password === 'poo') {
      setIsAdminAuthenticated(true);
      setShowAuthPrompt(false);
      setPassword('');
      // Trigger admin mode after authentication
      toggleAdminMode();
    } else {
      alert('Invalid password');
    }
  };

  return (
    <>
      <div className={`flex items-center ${className}`}>
        {/* Toggle Label */}
        <span className="mr-3 text-sm font-medium text-white">
          {isAdminMode ? 'Admin' : 'User'}
        </span>
        
        {/* Toggle Switch */}
        <button
          onClick={handleToggleClick}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-700 ${
            isAdminMode
              ? 'bg-orange-500 focus:ring-orange-300'
              : 'bg-white/20 focus:ring-white/50'
          }`}
          role="switch"
          aria-checked={isAdminMode}
          aria-label="Toggle admin mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
              isAdminMode 
                ? 'translate-x-6 bg-white' 
                : 'translate-x-1 bg-white'
            }`}
          />
        </button>
      </div>

      {/* Authentication Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Admin Authentication
            </h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowAuthPrompt(false);
                  setPassword('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthenticate}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 