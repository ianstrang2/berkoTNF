/**
 * Claim Player Profile Page
 * 
 * /auth/claim-profile
 * After phone auth, players link their account to existing player profile
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function ClaimProfileForm() {
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // Get all active players
        const response = await fetch('/api/players');
        if (response.ok) {
          const data = await response.json();
          // Filter to only show players without auth_user_id (unclaimed profiles)
          // Exclude ringers and retired players
          const unclaimedPlayers = data.data?.filter((p: any) => 
            !p.authUserId && !p.isRinger && !p.isRetired
          ) || [];
          setPlayers(unclaimedPlayers);
        }
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load player list');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return;

    setSubmitting(true);
    setError('');

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Link player profile to authenticated user
      const response = await fetch('/api/auth/player/claim-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: selectedPlayerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link profile');
      }

      // Success! Go to dashboard
      router.push('/');
    } catch (err: any) {
      console.error('Error claiming profile:', err);
      setError(err.message || 'Failed to claim profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    // They can claim later from settings
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading players...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 p-3">
            <img 
              src="/img/logo.png" 
              alt="Capo Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Claim Your Profile</h1>
          <p className="text-gray-600 mt-2">
            Link your account to your player stats
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-6">
              No unclaimed player profiles found. Contact your admin to create your player profile first.
            </p>
            <button
              onClick={handleSkip}
              className="py-3 px-6 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Continue to App
            </button>
          </div>
        ) : (
          <form onSubmit={handleClaim}>
            <div className="mb-6">
              <label htmlFor="player" className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Name
              </label>
              <select
                id="player"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={submitting}
              >
                <option value="">-- Select your name --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                This will link your phone number to your existing player stats
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedPlayerId}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {submitting ? 'Claiming...' : 'Claim Profile'}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 px-4 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
            >
              Skip for Now
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Can't find your name? Contact your team admin to add you to the system first.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ClaimProfilePage() {
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
      <ClaimProfileForm />
    </Suspense>
  );
}

