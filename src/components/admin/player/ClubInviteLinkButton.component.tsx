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
  const [activeTab, setActiveTab] = useState<'message' | 'link'>('message');

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
    setActiveTab('message');
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
        className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-green-600 to-green-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85 disabled:opacity-50"
      >
        {loading ? 'Loading...' : '📱 Club Invite Link'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={closeModal} aria-hidden="true"></div>
            
            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl max-w-lg w-full mx-auto shadow-soft-xl transform transition-all p-6" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-slate-700">
                  📱 Club Invite Link
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('message')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'message'
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📱 Pre-filled Message
                </button>
                <button
                  onClick={() => setActiveTab('link')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'link'
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  🔗 Link Only
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {activeTab === 'message' ? (
                  <>
                    <p className="text-sm text-slate-600">
                      Copy and paste this into WhatsApp or your team group:
                    </p>

                    {/* Message Display */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{whatsappMessage}</pre>
                    </div>

                    {/* Copy Message Button */}
                    <button
                      onClick={copyMessage}
                      className={`w-full px-4 py-3 font-medium text-white rounded-lg transition-all ${
                        copied 
                          ? 'bg-green-600' 
                          : 'bg-gradient-to-tl from-purple-700 to-pink-500 hover:scale-102 active:opacity-85'
                      }`}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy Message'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Share this link directly:
                    </p>

                    {/* Invite URL Display */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <code className="text-xs text-slate-700 break-all">{inviteUrl}</code>
                      </div>
                    </div>

                    {/* Copy Link Button */}
                    <button
                      onClick={copyToClipboard}
                      className={`w-full px-4 py-3 font-medium text-white rounded-lg transition-all ${
                        copied 
                          ? 'bg-green-600' 
                          : 'bg-gradient-to-tl from-purple-700 to-pink-500 hover:scale-102 active:opacity-85'
                      }`}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                  </>
                )}

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-800">
                    <strong>💡 How it works:</strong>
                  </p>
                  <ul className="mt-2 text-xs text-blue-700 space-y-1 ml-4 list-disc">
                    <li>Share this link in your WhatsApp group</li>
                    <li>Players tap → verify phone → automatically linked!</li>
                    <li>Works for all players with phone numbers in the system</li>
                  </ul>
                </div>

                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 text-slate-600 font-medium text-sm hover:text-slate-900 transition-colors"
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

