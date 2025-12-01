'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth.hook';
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
  const { profile: authProfile, loading: authLoading } = useAuth();
  
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<ErrorState>({ show: false, message: '' });

  // Load player data once auth is ready
  useEffect(() => {
    const loadPlayerData = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // If no player ID, we can't fetch - show empty form
      if (!authProfile.linkedPlayerId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch(`/player/profile`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const playerData = {
            name: result.data.name || '',
            email: result.data.email || '',
            club: result.data.club || null
          };
          setFormData(playerData);
          setOriginalData(playerData);
        }
      } catch (error) {
        console.error('Error loading player data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayerData();
  }, [authProfile.linkedPlayerId, authLoading]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/player/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email?.trim() || null,
          club: formData.club || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorState({ show: true, message: result.error || 'Failed to update profile' });
        setTimeout(() => setErrorState({ show: false, message: '' }), 3000);
        throw new Error(result.error || 'Failed to update profile');
      }

      // Success - use button flash pattern
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Update original data to match new saved state
      if (formData) {
        setOriginalData({
          name: formData.name,
          email: formData.email,
          club: formData.club
        });
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      // Error already set above
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form has changes (is dirty) - name excluded (read-only)
  const isDirty = formData && originalData && (
    formData.email !== originalData.email ||
    JSON.stringify(formData.club) !== JSON.stringify(originalData.club)
  );

  if (authLoading || isLoading) {
    return (
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border max-w-lg">
        <div className="p-6">
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-slate-600 text-sm">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Name Field - Read Only */}
        <div className="mb-4">
          <label className="block text-slate-700 text-sm font-medium mb-2">
            Your Name
          </label>
          <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-600">
            {formData.name || 'Not set'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contact your admin to change your display name
          </p>
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label className="block text-slate-700 text-sm font-medium mb-2">
            Email Address (Optional)
          </label>
          <input
            type="email"
            value={formData?.email || ''}
            onChange={(e) => formData && setFormData({ ...formData, email: e.target.value })}
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
            value={formData?.club || null}
            onChange={(club) => formData && setFormData({ ...formData, club })}
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
            disabled={!isDirty || isSubmitting}
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

