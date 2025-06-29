'use client';

import React, { useState, Suspense, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import useMatchState from '@/hooks/useMatchState.hook';
import PlayerPoolPane from '@/components/admin/matches/PlayerPoolPane.component';
import BalanceTeamsPane from '@/components/admin/matches/BalanceTeamsPane.component';
import CompleteMatchForm from '@/components/admin/matches/CompleteMatchForm.component';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import Button from '@/components/ui-kit/Button.component';
import StepperBar from '@/components/admin/matches/StepperBar.component';
import GlobalCtaBar from '@/components/admin/matches/GlobalCtaBar.component';
import { MoreVertical, Lock, Unlock, RotateCcw } from 'lucide-react';
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
  const { state, teamSize, players, actions, error, isBalanced, can, toast, matchDate } = useMatchState(matchId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State to hold data from child panes for the global CTA
  const [playerPoolIds, setPlayerPoolIds] = useState<number[]>([]);
  
  // Ref to trigger form submission from the global CTA
  const completeFormRef = useRef<CompleteFormHandle>(null);

  const { currentStep, primaryLabel, primaryAction, primaryDisabled } = useMemo(() => {
    let step: 'Pool' | 'Teams' | 'Complete' | 'Done' = 'Pool';
    let label = 'Loading...';
    let action = () => {};
    let disabled = true;

    switch (state) {
      case 'Draft':
        step = 'Pool';
        label = 'Lock Pool';
        action = () => actions.lockPool({ playerIds: playerPoolIds });
        disabled = playerPoolIds.length !== teamSize * 2;
        break;
      case 'PoolLocked':
        step = 'Teams';
        label = 'Confirm Teams';
        action = () => actions.confirmTeams();
        disabled = !isBalanced;
        break;
      case 'TeamsBalanced':
        step = 'Complete';
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
  }, [state, actions, playerPoolIds, teamSize, isBalanced]);

  const isLoading = state === 'Loading';

  if (isLoading) {
    return <AdminLayout><div className="p-4 text-center">Loading match data...</div></AdminLayout>;
  }

  if (error && !isLoading) {
    return (
       <AdminLayout>
        <div className="p-4 text-center text-red-500">
          <p>Error loading match: {error}</p>
          <Button onClick={() => actions.revalidate()} className="mt-4">Try Again</Button>
        </div>
      </AdminLayout>
    )
  }
  
  const renderMoreMenu = () => (
    <div className="relative">
      <Button onClick={() => setIsMenuOpen(!isMenuOpen)} variant="outline" size="sm">
        <MoreVertical size={16} />
      </Button>
      {isMenuOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-soft-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-10 border border-gray-100"
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <div className="py-1" role="menu" aria-orientation="vertical">
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

  const renderCurrentPane = () => {
    switch (state) {
      case 'Draft':
        return <PlayerPoolPane matchId={matchId} teamSize={teamSize} initialPlayers={players} onSelectionChange={setPlayerPoolIds} />;
      case 'PoolLocked':
        return <BalanceTeamsPane matchId={matchId} teamSize={teamSize} lockedPlayers={players} isBalanced={isBalanced} balanceTeamsAction={actions.balanceTeams} confirmTeamsAction={actions.confirmTeams} />;
      case 'TeamsBalanced':
      case 'Completed':
        return <CompleteMatchForm ref={completeFormRef} matchId={matchId} balancedPlayers={players} completeMatchAction={actions.completeMatch} isCompleted={state === 'Completed'} />;
      default:
        return <div>Invalid match state or state not handled: {state}</div>;
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
                {matchDate ? format(new Date(matchDate), 'EEEE, MMMM d, yyyy') : 'Loading date...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase py-1 px-3 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md">{state}</span>
              {renderMoreMenu()}
          </div>
      </div>
      
      <StepperBar currentStep={currentStep} />
      
      {renderCurrentPane()}
      
      {state !== 'Completed' && (
        <div className="mt-6">
          <GlobalCtaBar label={primaryLabel} onClick={primaryAction} disabled={primaryDisabled} />
        </div>
      )}
    </div>
  );
};

const MatchControlCentrePage = ({ params }: MatchControlCentrePageProps) => (
  <MainLayout>
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <MatchControlCentrePageContent params={params} />
    </Suspense>
  </MainLayout>
);

export default MatchControlCentrePage;