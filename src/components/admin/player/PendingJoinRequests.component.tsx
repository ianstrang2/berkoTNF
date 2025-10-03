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

  const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
  const [unclaimedPlayers, setUnclaimedPlayers] = useState<any[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedExistingPlayer, setSelectedExistingPlayer] = useState('');
  const [approvalMode, setApprovalMode] = useState<'new' | 'existing'>('new');

  const startApproval = async (requestId: string, phoneNumber: string) => {
    setApprovingRequest(requestId);
    setNewPlayerName('');
    setSelectedExistingPlayer('');
    setApprovalMode('new');

    // Fetch unclaimed players
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        const unclaimed = data.data?.filter((p: any) => 
          !p.authUserId && !p.isRinger && !p.isRetired
        ) || [];
        setUnclaimedPlayers(unclaimed);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const handleApprove = async () => {
    if (!approvingRequest) return;
    
    if (approvalMode === 'new' && !newPlayerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    if (approvalMode === 'existing' && !selectedExistingPlayer) {
      alert('Please select a player');
      return;
    }

    setProcessing(approvingRequest);
    
    try {
      const response = await fetch('/api/admin/join-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: approvingRequest,
          playerName: approvalMode === 'new' ? newPlayerName : undefined,
          existingPlayerId: approvalMode === 'existing' ? selectedExistingPlayer : undefined,
        }),
      });

      if (response.ok) {
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== approvingRequest));
        setApprovingRequest(null);
        alert('Player approved successfully!');
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
                onClick={() => startApproval(request.id, request.phone_number)}
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

      {/* Approval Modal */}
      {approvingRequest && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Approve Join Request</h3>
            
            <p className="text-sm text-slate-600 mb-4">
              Phone: <strong>{requests.find(r => r.id === approvingRequest)?.phone_number}</strong>
            </p>

            {/* Mode Selection */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setApprovalMode('new')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  approvalMode === 'new'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                Create New Player
              </button>
              <button
                onClick={() => setApprovalMode('existing')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  approvalMode === 'existing'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                Link to Existing
              </button>
            </div>

            {approvalMode === 'new' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Player Name
                </label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter player name"
                  autoFocus
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Existing Player
                </label>
                <select
                  value={selectedExistingPlayer}
                  onChange={(e) => setSelectedExistingPlayer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Select player --</option>
                  {unclaimedPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
                {unclaimedPlayers.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">No unclaimed players available</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setApprovingRequest(null)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing === approvingRequest}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {processing === approvingRequest ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

