/**
 * Pending Join Requests Component
 * 
 * Shows players waiting for admin approval after joining via invite link
 */

'use client';

import React, { useState, useEffect } from 'react';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
// React Query hooks for automatic deduplication
import { useJoinRequests, useApproveJoinRequest, useRejectJoinRequest, type JoinRequest } from '@/hooks/queries/useJoinRequests.hook';
import { usePlayers } from '@/hooks/queries/usePlayers.hook';

export const PendingJoinRequests: React.FC = () => {
  // React Query hooks - automatic deduplication and caching!
  const { data: requests = [], isLoading: loading } = useJoinRequests();
  const { data: allPlayers = [] } = usePlayers();
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();
  
  const [processing, setProcessing] = useState<string | null>(null); // UUID string, not number
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const [approvingRequest, setApprovingRequest] = useState<JoinRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<JoinRequest | null>(null);
  const [unclaimedPlayers, setUnclaimedPlayers] = useState<any[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedExistingPlayer, setSelectedExistingPlayer] = useState('');
  const [approvalMode, setApprovalMode] = useState<'new' | 'existing'>('new');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startApproval = (request: JoinRequest) => {
    setApprovingRequest(request);
    setNewPlayerName(request.name || '');
    setSelectedExistingPlayer('');
    setApprovalMode('new');
    setShowApprovalModal(true);

    // Use players from React Query (already fetched and cached!)
    const unclaimed = allPlayers.filter((p: any) => 
      !p.authUserId  // Show all unclaimed (includes ringers and retired)
    );
    setUnclaimedPlayers(unclaimed);
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

    setProcessing(approvingRequest.id);
    
    try {
      // Build request based on approval mode
      const requestData: any = {
        requestId: approvingRequest.id, // id is already a UUID string
      };
      
      if (approvalMode === 'new') {
        requestData.playerName = newPlayerName;
      } else {
        requestData.existingPlayerId = selectedExistingPlayer;
      }
      
      await approveMutation.mutateAsync(requestData);

      // Success - mutation automatically refetches lists
      setShowApprovalModal(false);
      setApprovingRequest(null);
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const startRejection = (request: JoinRequest) => {
    setRejectingRequest(request);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;

    setProcessing(rejectingRequest.id);
    
    try {
      await rejectMutation.mutateAsync(rejectingRequest.id); // id is already a UUID string

      // Success - mutation automatically refetches list
      setShowRejectModal(false);
      setRejectingRequest(null);
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      alert(`Error: ${err.message}`);
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
                Name
              </th>
              {!isMobile && (
                <>
                  <th className="px-4 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    Requested
                  </th>
                </>
              )}
              <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="p-4 align-middle bg-transparent border-b">
                  <span className="text-sm font-normal" style={{ color: 'rgb(103, 116, 142)' }}>
                    {request.name || <span className="italic">Not provided</span>}
                  </span>
                </td>
                {!isMobile && (
                  <>
                    <td className="p-4 align-middle bg-transparent border-b">
                      <span className="text-sm font-normal" style={{ color: 'rgb(103, 116, 142)' }}>
                        {request.phone}
                      </span>
                    </td>
                    <td className="p-4 align-middle bg-transparent border-b">
                      <span className="text-sm font-normal" style={{ color: 'rgb(103, 116, 142)' }}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </>
                )}
                <td className="p-4 text-center align-middle bg-transparent border-b">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => startApproval(request)}
                      disabled={processing === request.id}
                      className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85 disabled:opacity-50"
                    >
                      {processing === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => startRejection(request)}
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
      {showApprovalModal && approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          {/* Background overlay */}
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={() => {
            setShowApprovalModal(false);
            setApprovingRequest(null);
          }}></div>
          
          {/* Modal panel - mobile friendly with keyboard support */}
          <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6 my-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }} onClick={(e) => e.stopPropagation()}>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
              {/* Header */}
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Approve Join Request</h3>
              
              {/* Player Info */}
              <div className="p-3 border border-slate-200 rounded-lg mb-4">
                <div>
                  {approvingRequest.display_name && (
                    <p className="text-sm text-slate-700 mb-2">
                      <strong>Name:</strong> {approvingRequest.display_name}
                    </p>
                  )}
                  <p className="text-sm text-slate-700 mb-2">
                    <strong>Phone:</strong> {approvingRequest.phone_number}
                  </p>
                  {approvingRequest.email && (
                    <p className="text-sm text-slate-700">
                      <strong>Email:</strong> {approvingRequest.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="mb-4 flex gap-2">
                <button
                onClick={() => setApprovalMode('new')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-transparent relative ${
                  approvalMode === 'new'
                    ? 'text-slate-600 hover:scale-102'
                    : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:scale-102'
                }`}
                style={approvalMode === 'new' ? {
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(to top left, rgb(126, 34, 206), rgb(236, 72, 153))',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                } : {}}
              >
                Create New Player
              </button>
              <button
                onClick={() => setApprovalMode('existing')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-transparent relative ${
                  approvalMode === 'existing'
                    ? 'text-slate-600 hover:scale-102'
                    : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:scale-102'
                }`}
                style={approvalMode === 'existing' ? {
                  border: '2px solid transparent',
                  backgroundImage: 'linear-gradient(white, white), linear-gradient(to top left, rgb(126, 34, 206), rgb(236, 72, 153))',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                } : {}}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-300 text-sm transition-all"
                  placeholder="Enter player name"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-300 text-sm transition-all"
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

              {/* Action buttons - Standardized to match SoftUI pattern */}
              <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleApprove}
                disabled={processing === approvingRequest.id}
                className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase rounded-lg transition-all bg-gradient-to-tl from-purple-700 to-pink-500 hover:scale-102 active:opacity-85 shadow-soft-md disabled:opacity-50 disabled:cursor-not-allowed leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
              >
                {processing === approvingRequest.id ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovingRequest(null);
                }}
                disabled={processing === approvingRequest.id}
                className="inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase rounded-lg transition-all bg-gradient-to-tl from-slate-100 to-slate-200 hover:scale-102 active:opacity-85 shadow-soft-md leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 ml-3"
              >
                Cancel
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Modal - Using SoftUIConfirmationModal */}
      <SoftUIConfirmationModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectingRequest(null);
        }}
        onConfirm={handleReject}
        title="Reject Join Request?"
        message={
          rejectingRequest ? `
            <div class="text-left">
              <div class="p-3 border border-slate-200 rounded-lg mb-2">
                <div>
                  ${rejectingRequest.display_name ? `<p class="text-sm text-slate-700 mb-2"><strong>Name:</strong> ${rejectingRequest.display_name}</p>` : ''}
                  <p class="text-sm text-slate-700 mb-2"><strong>Phone:</strong> ${rejectingRequest.phone_number}</p>
                  ${rejectingRequest.email ? `<p class="text-sm text-slate-700"><strong>Email:</strong> ${rejectingRequest.email}</p>` : ''}
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                This player can request to join again later.
              </p>
            </div>
          ` : ''
        }
        confirmText="Reject"
        cancelText="Cancel"
        isConfirming={processing === rejectingRequest?.id}
        icon="warning"
      />
    </div>
  );
};


