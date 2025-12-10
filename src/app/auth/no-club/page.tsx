/**
 * No Club Found Page
 * 
 * /auth/no-club
 * Edge case: User authenticated successfully but phone not in any players table
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/apiConfig';

function NoClubForm() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Club code (5-character alphanumeric)
  const [clubCode, setClubCode] = useState('');

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate club code format (5 alphanumeric characters)
      const normalizedCode = clubCode.trim().toUpperCase();
      
      if (normalizedCode.length !== 5) {
        throw new Error('Club code must be 5 characters');
      }

      if (!/^[A-Z0-9]{5}$/.test(normalizedCode)) {
        throw new Error('Club code can only contain letters and numbers');
      }

      // Look up club by code
      const response = await apiFetch('/join/by-code', {
        method: 'POST',
        body: JSON.stringify({ club_code: normalizedCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Club not found');
      }

      // Club found! Redirect to join flow
      router.push(data.join_url);
    } catch (error: any) {
      console.error('Error looking up club code:', error);
      setError(error.message || 'Failed to find club');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">?</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">We couldn't find your club</h1>
          <p className="text-gray-600 mt-2">
            Your phone number isn't associated with any club yet
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Club code entry */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter your club code</h2>
          
          <form onSubmit={handleJoinWithCode}>
            <div className="mb-4">
              <label htmlFor="clubCode" className="block text-sm font-medium text-gray-700 mb-2">
                5-Character Club Code
              </label>
              <input
                id="clubCode"
                type="text"
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value.toUpperCase())}
                placeholder="FC247"
                maxLength={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center text-2xl tracking-widest font-mono uppercase"
                required
                disabled={loading}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Ask your admin for your club's 5-character code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || clubCode.length !== 5}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Looking up club...' : 'Continue'}
            </button>
          </form>
        </div>

        {/* Help text */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 text-center">
            💡 <strong>Where to find your club code?</strong><br />
            Your admin can find it in their Players page - it's displayed next to the invite link
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Want to start your own club?
          </p>
          <button
            onClick={() => router.push('/signup/admin')}
            className="w-full mt-3 py-2 px-4 text-purple-700 font-medium text-sm hover:text-purple-900 transition-colors"
          >
            Create a New Club →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NoClubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <NoClubForm />
    </Suspense>
  );
}
