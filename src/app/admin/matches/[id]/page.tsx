'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useMatchState from '@/hooks/useMatchState.hook';
import PlayerPoolPane from '@/components/admin/matches/PlayerPoolPane.component';
import BalanceTeamsPane from '@/components/admin/matches/BalanceTeamsPane.component';
import CompleteMatchForm from '@/components/admin/matches/CompleteMatchForm.component';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import Button from '@/components/ui-kit/Button.component';
import StepperBar from '@/components/admin/matches/StepperBar.component';
import GlobalCtaBar from '@/components/admin/matches/GlobalCtaBar.component';
import MatchModal from '@/components/team/modals/MatchModal.component';
import ConfirmationDialog from '@/components/ui-kit/ConfirmationDialog.component';
import { MoreVertical, Lock, Unlock, RotateCcw, Edit, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout.layout';
import { format } from 'date-fns';

interface MatchControlCentrePageProps {
  params: {
    id: string;
  };
}

// Type for the ref to access form's submit function
type CompleteFormHandle = {
  submit: () => void;
};

const MatchControlCentrePageContent = ({ params }: MatchControlCentrePageProps) => {
  const { id: matchId } = params;
  const router = useRouter();
  const { error, toast, can, matchData, showToast, actions } = useMatchState(matchId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [playerPoolIds, setPlayerPoolIds] = useState<string[]>([]);
  const completeFormRef = useRef<CompleteFormHandle>(null);

  // Edit/Delete modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Edit match data state
  const [editMatchData, setEditMatchData] = useState({
    date: '',
    team_size: 9,
    match_date: ''
  });
  
  // Helper function to format state display text
  const formatStateDisplay = (state: string) => {
    switch (state) {
      case 'PoolLocked':
      case 'POOLLOCKED':
        return 'POOL LOCKED';
      case 'TeamsBalanced':
      case 'TEAMSBALANCED':
        return 'TEAMS BALANCED';
      default:
        return state.toUpperCase();
    }
  };

  // Initialize edit data when modal opens
  const openEditModal = () => {
    if (matchData) {
      setEditMatchData({
        date: format(new Date(matchData.matchDate), 'yyyy-MM-dd'),
        team_size: matchData.teamSize,
        match_date: format(new Date(matchData.matchDate), 'yyyy-MM-dd')
      });
      setIsEditModalOpen(true);
    }
  };

  // Edit handler with success flash
  const handleEditMatch = async () => {
    setIsEditing(true);
    setEditError(null);
    
    try {
      const response = await fetch('/api/admin/upcoming-matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          match_date: editMatchData.date,
          team_size: editMatchData.team_size,
          state_version: matchData?.stateVersion
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update match');
      }

      // Success flash pattern (like copy button)
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2000);
      
      setIsEditModalOpen(false);
      actions.revalidate(); // Refresh match data
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsEditing(false);
    }
  };

  // Delete handler
  const handleDeleteMatch = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/admin/upcoming-matches?id=${matchId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete match');
      }

      router.push('/admin/matches');
    } catch (err: any) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };
  
  const { currentStep, primaryLabel, primaryAction, primaryDisabled } = useMemo(() => {
    if (!matchData) {
      return { currentStep: 'Pool' as 'Pool', primaryLabel: 'Loading...', primaryAction: () => {}, primaryDisabled: true };
    }
    let step: 'Pool' | 'Teams' | 'Result' | 'Done' = 'Pool';
    let label = '';
    let action = () => {};
    let disabled = true;

    switch (matchData.state) {
      case 'Draft':
        step = 'Pool';
        label = 'Lock Pool';
        action = () => actions.lockPool({ playerIds: playerPoolIds.map(id => Number(id)) });
        disabled = playerPoolIds.length !== matchData.teamSize * 2;
        break;
      case 'PoolLocked':
        step = 'Teams';
        label = 'Confirm Teams';
        action = () => actions.confirmTeams();
        disabled = !matchData.isBalanced;
        break;
      case 'TeamsBalanced':
        step = 'Result';
        label = 'Save Result';
        action = () => completeFormRef.current?.submit();
        disabled = false;
        break;
      case 'Completed':
        step = 'Done';
        label = 'Match Completed';
        action = () => {};
        disabled = true;
        break;
    }
    return { currentStep: step, primaryLabel: label, primaryAction: action, primaryDisabled: disabled };
  }, [matchData, playerPoolIds, actions]);

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  if (!matchData) {
    return <div className="p-4 text-center">Loading match data...</div>;
  }
  
  const canEdit = matchData?.state === 'Draft' || matchData?.state === 'PoolLocked';
  const hasMoreActions = can('unlockPool') || can('unlockTeams') || can('undoComplete') || canEdit;
  
  const renderMoreMenu = () => {
    if (!hasMoreActions) {
      return null;
    }

    return (
      <div className="relative">
        <Button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          variant={editSuccess ? "primary" : "outline"} 
          size="sm"
          className={editSuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : ""}
        >
          {editSuccess ? '✓' : <MoreVertical size={16} />}
        </Button>
        {isMenuOpen && (
          <div 
            className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-soft-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-10 border border-gray-100"
            onMouseLeave={() => setIsMenuOpen(false)}
          >
            <div className="py-1" role="menu" aria-orientation="vertical">
              {canEdit && (
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  openEditModal(); 
                  setIsMenuOpen(false); 
                }} className="text-slate-700 hover:bg-gray-100 hover:text-slate-900 group flex items-center px-4 py-2 text-sm">
                  <Edit className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Edit Match
                </a>
              )}
              {canEdit && (
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  setIsDeleteModalOpen(true); 
                  setIsMenuOpen(false); 
                }} className="text-red-600 hover:bg-red-50 hover:text-red-700 group flex items-center px-4 py-2 text-sm">
                  <Trash2 className="mr-3 h-5 w-5" />
                  Delete Match
                </a>
              )}
              {can('unlockPool') && (
                <a href="#" onClick={(e) => { e.preventDefault(); actions.unlockPool(); setIsMenuOpen(false); }} className="text-slate-700 hover:bg-gray-100 hover:text-slate-900 group flex items-center px-4 py-2 text-sm" role="menuitem">
                  <Unlock className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  Unlock Pool
                </a>
              )}
              {can('unlockTeams') && (
                <a href="#" onClick={(e) => { e.preventDefault(); actions.unlockTeams(); setIsMenuOpen(false); }} className="text-slate-700 hover:bg-gray-100 hover:text-slate-900 group flex items-center px-4 py-2 text-sm" role="menuitem">
                  <Lock className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  Unlock Teams & Re-Balance
                </a>
              )}
               {can('undoComplete') && (
                <a href="#" onClick={(e) => { e.preventDefault(); actions.undoComplete(); setIsMenuOpen(false); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 group flex items-center px-4 py-2 text-sm" role="menuitem">
                  <RotateCcw className="mr-3 h-5 w-5" aria-hidden="true" />
                  Undo Completion
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentPane = () => {
    switch (matchData.state) {
      case 'Draft':
        return <PlayerPoolPane matchId={matchId} teamSize={matchData.teamSize} initialPlayers={matchData.players} onSelectionChange={setPlayerPoolIds} />;
      case 'PoolLocked':
        return <BalanceTeamsPane matchId={matchId} teamSize={matchData.teamSize} players={matchData.players} isBalanced={matchData.isBalanced} balanceTeamsAction={actions.balanceTeams} clearTeamsAction={actions.clearAssignments} onShowToast={showToast} markAsUnbalanced={actions.markAsUnbalanced} />;
      case 'TeamsBalanced':
      case 'Completed':
        return <CompleteMatchForm ref={completeFormRef} matchId={matchId} players={matchData.players} completeMatchAction={actions.completeMatch} isCompleted={matchData.state === 'Completed'} />;
      default:
        return <div>Invalid match state or state not handled: {matchData.state}</div>;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl">
      {toast && (
            <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
              <div className="flex items-center justify-between">
                <p>{toast.message}</p>
                {toast.action && (
                    <Button size="sm" onClick={toast.action.onClick} className="ml-4 bg-white/20 hover:bg-white/30">{toast.action.label}</Button>
                )}
              </div>
            </div>
        )}
        <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Match Control Centre</h1>
              <p className="font-semibold text-base leading-relaxed" style={{ color: 'rgb(52, 71, 103)'}}>
                  {matchData.matchDate ? format(new Date(matchData.matchDate), 'EEEE, MMMM d, yyyy') : 'Loading date...'}
              </p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase py-1 px-3 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md">{formatStateDisplay(matchData.state)}</span>
                {renderMoreMenu()}
            </div>
        </div>
        
        <StepperBar currentStep={currentStep} />
        
        {renderCurrentPane()}
      
      {matchData.state !== 'Completed' && (
        <GlobalCtaBar label={primaryLabel} onClick={primaryAction} disabled={primaryDisabled} />
      )}

      {/* Edit Match Modal */}
      <MatchModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        data={editMatchData}
        onChange={(field, value) => setEditMatchData(prev => ({ ...prev, [field]: value }))}
        onSubmit={handleEditMatch}
        isLoading={isEditing}
        error={editError}
        isEditing={true}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onConfirm={handleDeleteMatch}
        onCancel={() => setIsDeleteModalOpen(false)}
        title="Delete Match"
        message={`Are you sure you want to delete this match on ${matchData?.matchDate ? format(new Date(matchData.matchDate), 'EEEE, MMMM d, yyyy') : 'this date'}? ${matchData?.players?.length || 0} players are assigned. This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Match'}
        cancelText="Cancel"
        isConfirming={isDeleting}
      />
    </div>
  );
};

const MatchControlCentrePage = ({ params }: MatchControlCentrePageProps) => (
  <MainLayout>
    <MatchControlCentrePageContent params={params} />
  </MainLayout>
);

export default MatchControlCentrePage;