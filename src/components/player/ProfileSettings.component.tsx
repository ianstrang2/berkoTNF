'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth.hook';
import { useAuthProfile } from '@/hooks/queries/useAuthProfile.hook';
import ClubSelector from '@/components/admin/player/ClubSelector.component';
import { Club } from '@/types/player.types';
import { apiFetch } from '@/lib/apiConfig';

interface ErrorState {
  show: boolean;
  message: string;
}

interface ProfileFormData {
  name: string;
  email: string;
  club: Club | null;
}

const ProfileSettings: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const { data: authData, refetch } = useAuthProfile();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    club: null
  });
  const [originalData, setOriginalData] = useState<ProfileFormData>({
    name: '',
    email: '',
    club: null
  });
  const [initialName, setInitialName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<ErrorState>({ show: false, message: '' });

  // Load player data
  useEffect(() => {
    const loadPlayerData = async () => {
      if (!authProfile.linkedPlayerId) return;

      try {
        const response = await apiFetch(`/admin/players?include_match_counts=false`);
        const result = await response.json();
        
        if (result.success) {
          const currentPlayer = result.data.find((p: any) => p.id === String(authProfile.linkedPlayerId));
          if (currentPlayer) {
            const playerData = {
              name: currentPlayer.name || '',
              email: currentPlayer.email || '',
              club: currentPlayer.club || null
            };
            setFormData(playerData);
            setOriginalData(playerData);
            setInitialName(currentPlayer.name || '');
          }
        }
      } catch (error) {
        console.error('Error loading player data:', error);
      }
    };

    loadPlayerData();
  }, [authProfile.linkedPlayerId]);

  // Clear name error when name changes
  useEffect(() => {
    if (nameError) {
      setNameError(null);
    }
  }, [formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setNameError(null);

    try {
      const response = await apiFetch('/player/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email?.trim() || null,
          club: formData.club || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.error.includes('already taken')) {
          setNameError(result.error);
        } else {
          setErrorState({ show: true, message: result.error || 'Failed to update profile' });
          setTimeout(() => setErrorState({ show: false, message: '' }), 3000);
        }
        throw new Error(result.error || 'Failed to update profile');
      }

      // Success - use button flash pattern
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Update original data to match new saved state
      setOriginalData({
        name: formData.name,
        email: formData.email,
        club: formData.club
      });
      
      // Update initial name for grandfathering logic
      setInitialName(formData.name);
      
      // Refetch auth profile to update display name
      refetch();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      // Error already set above
    } finally {
      setIsSubmitting(false);
    }
  };

  // Allow existing names >14 chars to remain (grandfathered)
  const allowLongName = initialName.length > 14 && formData.name === initialName;
  const maxNameLength = allowLongName ? undefined : 14;

  // Check if form has changes (is dirty)
  const isDirty = 
    formData.name !== originalData.name ||
    formData.email !== originalData.email ||
    JSON.stringify(formData.club) !== JSON.stringify(originalData.club);

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border max-w-lg">
      <div className="p-6">
        {/* Error Notification */}
        {errorState.show && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700">
            {errorState.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
        {/* Name Field */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-slate-700 text-sm font-medium">Your Name</label>
            <span className="text-xs text-slate-500">{formData.name.length} / {maxNameLength || '∞'}</span>
          </div>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-300 text-sm"
            placeholder="Enter your name"
            maxLength={maxNameLength}
            required
            disabled={isSubmitting}
          />
          {nameError && (
            <p className="text-xs text-red-500 mt-1">{nameError}</p>
          )}
          {allowLongName && (
            <p className="text-xs text-slate-500 mt-1">
              Your name exceeds the normal 14 character limit but is grandfathered in. If you change it, you'll need to follow the 14 character limit.
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label className="block text-slate-700 text-sm font-medium mb-2">
            Email Address (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-300 text-sm"
            placeholder="your@email.com"
            disabled={isSubmitting}
          />
          <p className="text-xs text-slate-500 mt-1">
            Used for notifications and match updates
          </p>
        </div>

        {/* Club Selector */}
        <div className="mb-6">
          <label className="block text-slate-700 text-sm font-medium mb-2">
            Favorite Club (Optional)
          </label>
          <ClubSelector 
            value={formData.club}
            onChange={(club) => setFormData({ ...formData, club })}
            disabled={isSubmitting}
          />
          <p className="text-xs text-slate-500 mt-1">
            Choose your favorite football club to display on your profile
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting || !formData.name || (maxNameLength && formData.name.length > maxNameLength)}
            className={`inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 uppercase text-xs px-4 py-2 rounded-md ${
              saveSuccess 
                ? 'text-white bg-gradient-to-tl from-green-600 to-green-500 shadow-soft-md hover:shadow-soft-lg border border-transparent'
                : isDirty
                ? 'text-white bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md hover:shadow-soft-lg border border-transparent cursor-pointer'
                : 'text-neutral-700 bg-white border border-neutral-300 opacity-50 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default ProfileSettings;

