'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useMatchState from '@/hooks/useMatchState.hook';
import { apiFetch } from '@/lib/apiConfig';
import { splitSizesFromPool, getPoolValidation, COPY_CONSTANTS } from '@/utils/teamSplit.util';
import { areAllSlotsFilled, getTeamCompletionStatus } from '@/utils/teamValidation.util';
import PlayerPoolPane from '@/components/admin/matches/PlayerPoolPane.component';
import BalanceTeamsPane, { BalanceTeamsPaneHandle } from '@/components/admin/matches/BalanceTeamsPane.component';
import CompleteMatchForm from '@/components/admin/matches/CompleteMatchForm.component';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import Button from '@/components/ui-kit/Button.component';
import StepperBar from '@/components/admin/matches/StepperBar.component';
import GlobalCtaBar from '@/components/admin/matches/GlobalCtaBar.component';
import MatchModal from '@/components/team/modals/MatchModal.component';
import MatchCompletedModal from '@/components/team/modals/MatchCompletedModal.component';
import SingleBlockedModal from '@/components/admin/matches/SingleBlockedModal.component';
import LockPoolWithBalanceModal from '@/components/admin/matches/LockPoolWithBalanceModal.component';
import { MoreVertical, Lock, Unlock, RotateCcw, Edit } from 'lucide-react';
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
  const { error, toast, matchCompletedModal, closeMatchCompletedModal, can, matchData, showToast, actions } = useMatchState(matchId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [playerPoolIds, setPlayerPoolIds] = useState<string[]>([]);
  const [isCompleteFormSubmitting, setIsCompleteFormSubmitting] = useState(false);
  const completeFormRef = useRef<CompleteFormHandle>(null);
  const balanceTeamsPaneRef = useRef<BalanceTeamsPaneHandle>(null);

  // Edit/Delete modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  
  // Blocked pool modal state
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  
  // Lock pool with balance modal state
  const [isLockBalanceModalOpen, setIsLockBalanceModalOpen] = useState(false);
  const [isLockingAndBalancing, setIsLockingAndBalancing] = useState(false);
  
  // Track initial balance method from Lock & Balance (for tornado chart)
  const [initialBalanceMethod, setInitialBalanceMethod] = useState<'ability' | 'performance' | 'random' | null>(null);
  
  // Save teams success flash state
  const [saveTeamsSuccess, setSaveTeamsSuccess] = useState(false);

  // Edit match data state
  const [editMatchData, setEditMatchData] = useState({
    date: '',
    team_size: 9,
    match_date: ''
  });
  
  // Helper function to format state display text
  // Takes into account teams_saved_at for PoolLocked state
  const formatStateDisplay = (state: string, teamsSavedAt?: string | null) => {
    switch (state) {
      case 'Draft':
      case 'DRAFT':
        return 'BUILDING';
      case 'PoolLocked':
      case 'POOLLOCKED':
        // Show ARRANGING if teams not yet saved, TEAMS SET if saved
        return teamsSavedAt ? 'TEAMS SET' : 'ARRANGING';
      case 'TeamsBalanced':
      case 'TEAMSBALANCED':
        return 'RESULT';
      case 'Completed':
      case 'COMPLETED':
        return 'COMPLETE';
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
      const response = await apiFetch('/admin/upcoming-matches', {
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

  // Track if BalanceTeamsPane has unsaved changes (will be set via callback)
  const [hasUnsavedTeamChanges, setHasUnsavedTeamChanges] = useState(false);
  
  // Handler for saving teams
  const handleSaveTeams = useCallback(async (teamAssignments?: any[]) => {
    try {
      // If no team assignments provided, get them from BalanceTeamsPane ref
      let assignments = teamAssignments;
      if (!assignments && balanceTeamsPaneRef.current) {
        const currentPlayers = balanceTeamsPaneRef.current.getCurrentPlayers();
        assignments = currentPlayers.map(player => ({
          player_id: player.id,
          team: player.team,
          slot_number: player.slot_number
        }));
      }
      
      await actions.saveTeams({ teamAssignments: assignments });
      setHasUnsavedTeamChanges(false);
      // Show success flash for 1.5 seconds
      setSaveTeamsSuccess(true);
      setTimeout(() => setSaveTeamsSuccess(false), 1500);
    } catch (err: any) {
      showToast(err.message || 'Failed to save teams', 'error');
    }
  }, [actions, showToast]);

  const { currentStep, primaryLabel, primaryAction, primaryDisabled, buttonHint } = useMemo(() => {
    if (!matchData) {
      return { currentStep: 'Pool' as 'Pool', primaryLabel: 'Loading...', primaryAction: () => {}, primaryDisabled: true, buttonHint: '' };
    }
    let step: 'Pool' | 'Teams' | 'Done' = 'Pool';
    let label = '';
    let action = () => {};
    let disabled = true;
    let hint = '';

    switch (matchData.state) {
      case 'Draft':
        step = 'Pool';
        label = 'Lock & Balance';
        
        const poolSize = playerPoolIds.length;
        const targetSize = matchData.teamSize * 2;
        const { a: sizeA, b: sizeB } = splitSizesFromPool(poolSize);
        const { disabled: poolDisabled, blocked } = getPoolValidation(poolSize);
        
        // Modify primary action: show blocked modal OR show lock+balance modal
        action = () => {
          // Single blocking condition: < 8 players
          if (blocked) {
            setIsBlockedModalOpen(true);
            return;
          }
          
          // Open lock + balance modal for viable scenarios (>=8 players)
          setIsLockBalanceModalOpen(true);
        };
        
        disabled = poolDisabled;
        
        // Dynamic hints
        if (poolSize === 0) {
          hint = 'Add players to begin';
        } else if (blocked) {
          const needed = 8 - poolSize;
          hint = `Need ${needed} more for 4v4 minimum`;
        } else if (poolSize === 8) {
          hint = `Lock 4v4`;
        } else if (poolDisabled) {
          hint = 'Maximum players reached. Remove some?';
        } else if (poolSize === targetSize) {
          hint = `Perfect for ${matchData.teamSize}v${matchData.teamSize}`;
        } else {
          hint = `Lock ${sizeA}v${sizeB}`;
        }
        break;
        
      case 'PoolLocked':
        step = 'Teams';
        const teamsSaved = matchData.teamsSavedAt !== null;
        const allSlotsFilled = areAllSlotsFilled(matchData.players, matchData.actualSizeA, matchData.actualSizeB);
        
        if (!teamsSaved) {
          // Teams not yet saved - primary action is Save Teams
          label = 'Save Teams';
          action = () => handleSaveTeams();
          disabled = !allSlotsFilled;
          if (!allSlotsFilled) {
            hint = getTeamCompletionStatus(matchData.players, matchData.actualSizeA, matchData.actualSizeB);
          } else {
            hint = 'Make teams visible to players';
          }
        } else if (hasUnsavedTeamChanges) {
          // Teams saved but have unsaved modifications
          label = 'Save Changes';
          action = () => handleSaveTeams();
          disabled = !allSlotsFilled;
          hint = 'Save your team modifications';
        } else {
          // Teams saved and no unsaved changes - can proceed to result
          label = 'Enter Result';
          action = () => actions.confirmTeams(); // This transitions to TeamsBalanced
          disabled = !allSlotsFilled;
          if (!allSlotsFilled) {
            hint = getTeamCompletionStatus(matchData.players, matchData.actualSizeA, matchData.actualSizeB);
          }
        }
        break;
        
      case 'TeamsBalanced':
        step = 'Done'; // Step 3 - entering result
        label = isCompleteFormSubmitting ? 'Saving...' : 'Save Result';
        action = () => completeFormRef.current?.submit();
        disabled = isCompleteFormSubmitting;
        break;
        
      case 'Completed':
        step = 'Done';
        label = 'Match Completed';
        action = () => {};
        disabled = true;
        break;
    }
    return { currentStep: step, primaryLabel: label, primaryAction: action, primaryDisabled: disabled, buttonHint: hint };
  }, [matchData, playerPoolIds, actions, isCompleteFormSubmitting, hasUnsavedTeamChanges, handleSaveTeams]);

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  if (!matchData) {
    return <div className="p-4 text-center">Loading match data...</div>;
  }
  
  const canEdit = matchData?.state !== 'Completed';
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
        return <PlayerPoolPane matchId={matchId} teamSize={matchData.teamSize} initialPlayers={matchData.players} onSelectionChange={setPlayerPoolIds} matchDate={matchData.matchDate} />;
      case 'PoolLocked':
        return (
          <BalanceTeamsPane 
            ref={balanceTeamsPaneRef}
            matchId={matchId} 
            teamSize={matchData.teamSize} 
            actualSizeA={matchData.actualSizeA} 
            actualSizeB={matchData.actualSizeB} 
            players={matchData.players} 
            isBalanced={matchData.isBalanced} 
            balanceTeamsAction={actions.balanceTeams} 
            onShowToast={showToast} 
            markAsUnbalanced={actions.markAsUnbalanced} 
            onPlayersUpdated={actions.revalidate}
            teamsSavedAt={matchData.teamsSavedAt}
            onUnsavedChangesChange={setHasUnsavedTeamChanges}
            initialBalanceMethod={initialBalanceMethod}
          />
        );
      case 'TeamsBalanced':
      case 'Completed':
        return (
          <CompleteMatchForm 
            ref={completeFormRef} 
            matchId={matchId} 
            players={matchData.players} 
            completeMatchAction={actions.completeMatch} 
            isCompleted={matchData.state === 'Completed'}
            onLoadingChange={setIsCompleteFormSubmitting}
          />
        );
      default:
        return <div>Invalid match state or state not handled: {matchData.state}</div>;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl max-md:pb-40">
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
        <div className="flex justify-between items-center mb-4">
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-slate-800">Match Control Centre</h1>
              <p className="font-semibold text-base leading-relaxed" style={{ color: 'rgb(52, 71, 103)'}}>
                  {matchData.matchDate ? format(new Date(matchData.matchDate), 'EEEE, MMMM d, yyyy') : 'Loading...'}
              </p>
            </div>
            {/* Mobile: Compact stepper only - ml-4 aligns with card content padding */}
            <div className="flex items-center gap-2 md:hidden ml-4">
              <StepperBar currentStep={currentStep} variant="compact" />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase py-1 px-3 rounded-full border border-neutral-300 bg-transparent text-neutral-500">{formatStateDisplay(matchData.state, matchData.teamsSavedAt)}</span>
                {renderMoreMenu()}
            </div>
        </div>
        
        {/* Full stepper on desktop only */}
        <div className="hidden md:block">
          <StepperBar currentStep={currentStep} />
        </div>
        
        {renderCurrentPane()}
      
      {matchData.state !== 'Completed' && (
        <GlobalCtaBar 
          label={primaryLabel} 
          onClick={primaryAction} 
          disabled={primaryDisabled} 
          hint={buttonHint}
          successState={saveTeamsSuccess}
        />
      )}

      {/* Match Completed Modal */}
      <MatchCompletedModal
        isOpen={matchCompletedModal.isOpen}
        onClose={closeMatchCompletedModal}
        teamAName={matchCompletedModal.teamAName}
        teamBName={matchCompletedModal.teamBName}
        teamAScore={matchCompletedModal.teamAScore}
        teamBScore={matchCompletedModal.teamBScore}
      />

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

      {/* Single Blocked Modal */}
      <SingleBlockedModal 
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
        poolSize={playerPoolIds.length}
      />

      {/* Lock Pool with Balance Modal */}
      <LockPoolWithBalanceModal
        isOpen={isLockBalanceModalOpen}
        onClose={() => setIsLockBalanceModalOpen(false)}
        onConfirm={async (method) => {
          setIsLockingAndBalancing(true);
          try {
            const { a: sizeA, b: sizeB } = splitSizesFromPool(playerPoolIds.length);
            await actions.lockPool({ 
              playerIds: playerPoolIds.map(id => Number(id)),
              balanceMethod: method
            });
            // Store the balance method for tornado chart display
            setInitialBalanceMethod(method);
            setIsLockBalanceModalOpen(false);
          } catch (err: any) {
            showToast(err.message || 'Failed to lock and balance', 'error');
          } finally {
            setIsLockingAndBalancing(false);
          }
        }}
        isLoading={isLockingAndBalancing}
        poolSize={playerPoolIds.length}
        sizeA={splitSizesFromPool(playerPoolIds.length).a}
        sizeB={splitSizesFromPool(playerPoolIds.length).b}
      />
    </div>
  );
};

const MatchControlCentrePage = ({ params }: MatchControlCentrePageProps) => (
  <MatchControlCentrePageContent params={params} />
);

export default MatchControlCentrePage;