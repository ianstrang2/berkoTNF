/**
 * Pending Join Requests Component
 * 
 * Shows players waiting for admin approval after joining via invite link
 */

'use client';

import React, { useState, useEffect } from 'react';

interface JoinRequest {
  id: string;
  phone_number: string;
  display_name: string | null;
  created_at: string;
}

export const PendingJoinRequests: React.FC = () => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/join-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching join requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: string, phoneNumber: string) => {
    const playerName = prompt(`Enter the player's name to create their profile:\n\nPhone: ${phoneNumber}`);
    
    if (!playerName) return;

    setProcessing(requestId);
    
    try {
      const response = await fetch('/api/admin/join-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          playerName,
        }),
      });

      if (response.ok) {
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== requestId));
        alert('Player approved and profile created!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this join request?')) return;

    setProcessing(requestId);
    
    try {
      const response = await fetch('/api/admin/join-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">📱</span>
        <h3 className="text-lg font-bold text-gray-900">
          Pending Join Requests ({requests.length})
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        These players have verified their phone number and are waiting to be added to the team.
      </p>

      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{request.phone_number}</p>
              <p className="text-xs text-gray-500">
                Requested {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(request.id, request.phone_number)}
                disabled={processing === request.id}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {processing === request.id ? '...' : '✓ Approve'}
              </button>
              <button
                onClick={() => handleReject(request.id)}
                disabled={processing === request.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

