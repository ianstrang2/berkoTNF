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
  const [rejectingRequest, setRejectingRequest] = useState<string | null>(null);
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

  const startRejection = (requestId: string) => {
    setRejectingRequest(requestId);
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;

    setProcessing(rejectingRequest);
    
    try {
      const response = await fetch('/api/admin/join-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: rejectingRequest }),
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== rejectingRequest));
        setRejectingRequest(null);
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
    <div className="bg-white rounded-2xl shadow-soft-xl p-6 mb-6 lg:w-fit">
      <h5 className="font-bold text-slate-700 mb-4">Pending Join Requests</h5>
      
      <div className="overflow-x-auto">
        <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
          <thead className="align-bottom">
            <tr>
              <th className="px-4 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Phone Number
              </th>
              <th className="px-4 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Requested
              </th>
              <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="p-4 align-middle bg-transparent border-b">
                  <h6 className="mb-0 leading-normal text-sm text-slate-600">{request.phone_number}</h6>
                </td>
                <td className="p-4 align-middle bg-transparent border-b">
                  <span className="text-xs text-slate-500">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-4 text-center align-middle bg-transparent border-b">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => startApproval(request.id, request.phone_number)}
                      disabled={processing === request.id}
                      className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85 disabled:opacity-50"
                    >
                      {processing === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => startRejection(request.id)}
                      disabled={processing === request.id}
                      className="inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval Modal */}
      {approvingRequest && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={() => setApprovingRequest(null)}></div>
            
            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl max-w-md w-full shadow-soft-xl p-6">
              {/* Header */}
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Approve Join Request</h3>
              
              {/* Player Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
                <div className="space-y-1 text-sm">
                  {requests.find(r => r.id === approvingRequest)?.display_name && (
                    <p className="text-slate-700">
                      <strong>Name:</strong> {requests.find(r => r.id === approvingRequest)?.display_name}
                    </p>
                  )}
                  <p className="text-slate-700">
                    <strong>Phone:</strong> {requests.find(r => r.id === approvingRequest)?.phone_number}
                  </p>
                </div>
              </div>

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

            {/* Action buttons */}
            <div className="flex justify-end pt-2 border-t border-slate-200 mt-4">
              <button
                onClick={() => setApprovingRequest(null)}
                className="mr-3 inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                disabled={processing === approvingRequest}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing === approvingRequest}
                className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-fuchsia-500 to-pink-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === approvingRequest ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={() => setRejectingRequest(null)}></div>
            
            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl max-w-md w-full shadow-soft-xl p-6">
              {/* Header with icon */}
              <div className="mb-5">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tl from-purple-700 to-pink-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-lg font-medium text-slate-700">Reject Join Request?</h4>
                  </div>
                </div>

                {/* Request Info */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="space-y-1 text-sm">
                    {requests.find(r => r.id === rejectingRequest)?.display_name && (
                      <p className="text-slate-700">
                        <strong>Name:</strong> {requests.find(r => r.id === rejectingRequest)?.display_name}
                      </p>
                    )}
                    <p className="text-slate-700">
                      <strong>Phone:</strong> {requests.find(r => r.id === rejectingRequest)?.phone_number}
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                      This player can request to join again later.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end pt-2 border-t border-slate-200 mt-4">
                <button
                  onClick={() => setRejectingRequest(null)}
                  className="mr-3 inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                  disabled={processing === rejectingRequest}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing === rejectingRequest}
                  className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-fuchsia-500 to-pink-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing === rejectingRequest ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

