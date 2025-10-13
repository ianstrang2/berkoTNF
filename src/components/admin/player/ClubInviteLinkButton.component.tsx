/**
 * Club Invite Link Button
 * 
 * Displays club invite link with copy-to-clipboard functionality
 */

'use client';

import React, { useState } from 'react';

export const ClubInviteLinkButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchInviteLink = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/club-invite');
      const data = await response.json();
      
      if (data.success) {
        setInviteUrl(data.data.inviteUrl);
        setShowModal(true);
      } else {
        alert('Failed to get invite link');
      }
    } catch (err) {
      console.error('Error fetching invite link:', err);
      alert('Failed to get invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy link');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCopied(false);
  };

  const whatsappMessage = `Join BerkoTNF on Capo ⚽

All match invites and RSVPs happen in the Capo app.
Download to get notifications and secure your spot:

👉 ${inviteUrl}`;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy message');
    }
  };

  return (
    <>
      <button
        onClick={fetchInviteLink}
        disabled={loading}
        className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-white border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Link'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={closeModal} aria-hidden="true"></div>
            
            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-soft-xl transform transition-all p-6" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <h3 className="text-lg font-semibold text-slate-700 mb-5">
                Club Invite Link
              </h3>

              {/* Content */}
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-3">
                  Copy and paste this into WhatsApp or your team group:
                </p>

                {/* Message Display */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{whatsappMessage}</pre>
                </div>
              </div>

              {/* Action buttons - Standardized to match SoftUI pattern */}
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={copyMessage}
                  className={`inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase rounded-lg transition-all leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 ${
                    copied 
                      ? 'bg-green-600' 
                      : 'bg-gradient-to-tl from-purple-700 to-pink-500 hover:scale-102 active:opacity-85 shadow-soft-md'
                  }`}
                  disabled={copied}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
                <button
                  onClick={closeModal}
                  className="inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase rounded-lg transition-all bg-gradient-to-tl from-slate-100 to-slate-200 hover:scale-102 active:opacity-85 shadow-soft-md leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 ml-3"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

