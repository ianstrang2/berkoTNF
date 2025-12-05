/**
 * Club Invite Share Button
 * 
 * Fetches club invite link and displays ShareMenu for sharing
 */

'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiConfig';
import ShareMenu from '@/components/ui-kit/ShareMenu.component';
import { useAuth } from '@/hooks/useAuth.hook';

export const ClubInviteLinkButton: React.FC = () => {
  const { profile } = useAuth();
  const [inviteUrl, setInviteUrl] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch invite link on mount
  useEffect(() => {
    const fetchInviteLink = async () => {
      try {
        const response = await apiFetch('/admin/club-invite');
        const data = await response.json();
        
        if (data.success) {
          setInviteUrl(data.data.inviteUrl);
          setTenantName(data.data.tenantName);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching invite link:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInviteLink();
  }, []);

  // Build the invite message with club code included
  const inviteMessage = `Join ${tenantName} on Capo ⚽

All match invites and RSVPs happen in the Capo app.
Download to get notifications and secure your spot:

👉 ${inviteUrl}

Or use your club code ${profile.clubCode || ''}`;

  if (loading) {
    return (
      <button
        disabled
        className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-400 uppercase align-middle bg-white border border-slate-200 rounded-lg opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (error || !inviteUrl) {
    return null; // Don't show button if invite link failed to load
  }

  return (
    <ShareMenu
      text={inviteMessage}
      context="custom"
      emailSubject={`Join ${tenantName} on Capo`}
      title={`Join ${tenantName}`}
      size="sm"
    />
  );
};

