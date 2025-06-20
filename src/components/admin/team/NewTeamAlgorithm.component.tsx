import React, { useState } from 'react';
import { useTeamAlgorithm } from '@/hooks/useTeamAlgorithm.hook';
import { useBalanceWeights } from '@/hooks/useBalanceWeights.hook';
import { formatDateSafely, getCurrentDateString } from '@/utils/teamAlgorithm.util';
import PlayerPool from '@/components/team/PlayerPool.component';
import TeamSection from '@/components/team/TeamSection.component';
import TornadoChart from '@/components/team/TornadoChart.component';
import ComparativeStats from '@/components/team/ComparativeStats.component';
import PlayerFormModal from '@/components/admin/player/PlayerFormModal.component';
import MatchModal from '@/components/team/modals/MatchModal.component';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { NewMatchData as NewMatchDataType, Player, Slot } from '@/types/team-algorithm.types';

const NewTeamAlgorithm: React.FC = () => {
  // State for balance options modal
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceMethod, setBalanceMethod] = useState<'ability' | 'random' | 'performance'>('ability');
  
  // Local state for NewMatchData
  const [newMatchData, setNewMatchData] = useState<NewMatchDataType>({
    match_date: getCurrentDateString(), // Initialize with current date
    team_size: 9, // Default team size
    date: getCurrentDateString(), // duplicate date field for NewMatchDataType
  });

  // Fetch balance algorithm weights
  const { formattedWeights } = useBalanceWeights();
  
  const {
    // State
    players,
    activeMatch,
    currentSlots,
    isBalanced,
    error,
    balanceProgress,
    isRingerModalOpen,
    isMatchModalOpen,
    isClearConfirmOpen,
    isLoading,
    selectedPoolPlayers,
    orangePositionGroups,
    greenPositionGroups,
    draggedItem,
    highlightedSlot,
    selectedSlot,
    createMatchError,
    copySuccess,
    pendingPlayerToggles,
    lastSuccessfulBalanceMethod,
    // Destructure new stats
    orangeTeamStats,
    greenTeamStats,
    comparativeStats,
    
    // Actions
    setIsRingerModalOpen,
    setIsMatchModalOpen,
    setIsClearConfirmOpen,
    handleAddRinger,
    handleCreateMatch,
    handleClearTeams,
    confirmClearTeams,
    handleTogglePlayerInPool,
    handleAssignPoolPlayers,
    handleBalanceTeams,
    handleCopyTeams,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap,
    selectPlayer,
    getAvailablePlayersFn,
  } = useTeamAlgorithm();

  // Alias for convenience if needed, or use getAvailablePlayersFn directly
  // const getAvailablePlayers = getAvailablePlayersFn; // We will use a wrapper

  // Component's own handler for match form changes
  const handleMatchFormChange = (field: keyof NewMatchDataType, value: any) => {
    setNewMatchData(prev => ({ ...prev, [field]: value }));
  };
  
  // Balance teams using the selected method
  const proceedWithBalancing = async () => {
    // Close the modal first
    setIsBalanceModalOpen(false);
    
    // Call the balance function with the selected method
    await handleBalanceTeams(balanceMethod);
  };

  // Method for getting comparative balance value
  const getComparativeBalanceValue = () => {
    if (!comparativeStats || typeof comparativeStats.balanceScore === 'undefined') return 0;
    return Math.round((1 - comparativeStats.balanceScore) * 100); // Use actual stats
  };

  // Wrapper for handleTogglePlayerInPool
  const togglePlayerWrapper = (player: Player) => {
    // const isCurrentlySelected = selectedPoolPlayers.some(p => p.id === player.id); // This logic is now inside the hook
    handleTogglePlayerInPool(player); // Pass the full player object
  };

  // Wrapper for getAvailablePlayersFn
  const getAvailablePlayersWrapper = (slot: Slot): Player[] => {
    return getAvailablePlayersFn(slot, players); // players is from useTeamAlgorithm hook
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 lg:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
        {/* SECTION 1: Match setup and player pool */}
        <Card 
          className="w-full"
          title={
            <div className="flex justify-between items-center w-full">
              <div>
                <h2 className="text-lg font-bold text-slate-700 font-sans">
                  {activeMatch ? `Match: ${formatDateSafely(activeMatch.match_date)}` : 'Create Match'}
                </h2>
                {activeMatch && (
                  <p className="text-sm text-slate-500">
                    Format: {activeMatch.team_size}v{activeMatch.team_size}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                className="rounded-lg shadow-soft-sm"
                onClick={() => setIsMatchModalOpen(true)}
              >
                {activeMatch ? 'Edit Match' : 'Create Match'}
              </Button>
            </div>
          }
        >
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-700">
              {error}
            </div>
          )}
          
          {/* Player pool */}
          <div>
            <PlayerPool 
              allPlayers={players}
              selectedPlayers={selectedPoolPlayers}
              onTogglePlayer={togglePlayerWrapper}
              teamSize={activeMatch?.team_size || 9}
              onBalanceTeams={() => handleBalanceTeams('ability')}
              isBalancing={isLoading && balanceProgress > 0}
              maxPlayers={(activeMatch?.team_size || 9) * 2} // Maximum players allowed
              pendingPlayers={pendingPlayerToggles}
            />
            
            {/* Player management buttons */}
            <div className="mt-4 flex gap-3 justify-end">
              <Button 
                variant="secondary"
                className="rounded-lg shadow-soft-sm"
                onClick={handleClearTeams}
                disabled={selectedPoolPlayers.length === 0 && !isLoading}
              >
                Clear
              </Button>
              
              <Button 
                variant="secondary"
                className="rounded-lg shadow-soft-sm"
                onClick={() => setIsRingerModalOpen(true)}
                disabled={selectedPoolPlayers.length >= (activeMatch?.team_size || 9) * 2}
              >
                Create Player
              </Button>
              
              <Button 
                variant="primary"
                className="rounded-lg font-semibold bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md hover:shadow-soft-lg"
                onClick={() => setIsBalanceModalOpen(true)}
                disabled={isLoading || selectedPoolPlayers.length < ((activeMatch?.team_size || 9) * 2)}
              >
                Build Teams
              </Button>
            </div>
          </div>
        </Card>
        
        <div className="flex flex-col">
          {/* SECTION 2: Team display */}
          <Card
            className="w-full lg:max-w-sm"
            title={
              <div className="flex justify-between items-center w-full">
                <h2 className="text-lg font-bold text-slate-700 font-sans">Teams</h2>
                <Button 
                  variant={copySuccess ? "primary" : "secondary"}
                  className={copySuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : "shadow-soft-md"}
                  onClick={handleCopyTeams}
                  disabled={!currentSlots.some(slot => slot.player_id !== null)}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            }
          >
            {/* Teams display - 2 columns: Team A | Team B */}
            <div className="grid grid-cols-2 gap-2">
              {/* Team A */}
              <div className="w-full">
                <TeamSection 
                  teamType="a"
                  slots={currentSlots.filter(s => s.slot_number <= (activeMatch?.team_size || 9))}
                  players={players}
                  positionGroups={orangePositionGroups}
                  onSelect={selectPlayer}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onTap={handleSlotTap}
                  isLoading={isLoading}
                  highlightedSlot={highlightedSlot}
                  selectedSlot={selectedSlot}
                  getAvailablePlayers={getAvailablePlayersWrapper}
                  isReadOnly={isBalanced} // Make read-only when balanced
                />
              </div>
              
              {/* Team B */}
              <div className="w-full">
                <TeamSection 
                  teamType="b"
                  slots={currentSlots.filter(s => s.slot_number > (activeMatch?.team_size || 9))}
                  players={players}
                  positionGroups={greenPositionGroups}
                  onSelect={selectPlayer}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onTap={handleSlotTap}
                  isLoading={isLoading}
                  highlightedSlot={highlightedSlot}
                  selectedSlot={selectedSlot}
                  getAvailablePlayers={getAvailablePlayersWrapper}
                  isReadOnly={isBalanced} // Make read-only when balanced
                />
              </div>
            </div>
          </Card>
          
          {/* Team Analysis Section - Conditionally render based on lastSuccessfulBalanceMethod */}
          {lastSuccessfulBalanceMethod === 'ability' && orangeTeamStats && greenTeamStats && comparativeStats && (
            <div className="w-full lg:max-w-sm">
              <div className="relative z-20 flex flex-col min-w-0 break-words bg-white border-0 border-solid border-black-125 shadow-soft-xl rounded-2xl bg-clip-border">
                <div className="flex-auto p-4">
                  
                  <div className="pt-0 pb-0 pr-1 mb-4 bg-gradient-to-tl from-gray-900 to-slate-800 rounded-xl">
                    <div>
                      <TornadoChart 
                        teamAStats={orangeTeamStats} 
                        teamBStats={greenTeamStats} 
                        weights={formattedWeights} // Ensure formattedWeights is available and correct
                      />
                    </div>
                  </div>

                  
                  <div className="w-full px-0 mx-auto max-w-screen-2xl rounded-xl">
                    <div className="flex flex-wrap mt-0">
                      <div className="flex-none max-w-full py-4 pl-0 pr-3 mt-0">
                        <div className="flex mb-2">
                          <div className="flex items-center justify-center w-5 h-5 mr-2 text-center bg-center rounded fill-current shadow-soft-2xl bg-gradient-to-tl from-blue-600 to-cyan-400 text-neutral-900">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="mt-1 mb-0 font-semibold leading-tight text-xs">Balance</p>
                        </div>
                        <h4 className="font-bold">{getComparativeBalanceValue()}%</h4>
                        <div className="text-xs h-0.75 flex w-60 overflow-visible rounded-lg bg-gray-200">
                          <div
                            className={`duration-600 ease-soft -mt-0.4 -ml-px flex h-1.5 flex-col justify-center overflow-hidden whitespace-nowrap rounded-lg text-center text-white transition-all ${getComparativeBalanceValue() >= 80 ? 'w-4/5 bg-gradient-to-tl from-blue-600 to-cyan-400' : getComparativeBalanceValue() >= 60 ? 'w-3/5 bg-gradient-to-tl from-purple-700 to-pink-500' : 'w-2/5 bg-gradient-to-tl from-red-600 to-rose-400'}`}
                            role="progressbar" 
                            aria-valuenow={getComparativeBalanceValue()} 
                            aria-valuemin={0} 
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar for balancing */}
      {isLoading && (
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-slate-500">Balancing teams...</span>
            <span className="text-xs font-medium text-slate-700">{Math.round(balanceProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-tl from-purple-700 to-pink-500 h-2 rounded-full"
              style={{ width: `${balanceProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <PlayerFormModal 
        isOpen={isRingerModalOpen}
        onClose={() => setIsRingerModalOpen(false)}
        onSubmit={handleAddRinger}
        isProcessing={isLoading}
        title="Add New Player"
        submitButtonText="Create Player"
      />
      
      <MatchModal 
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        data={newMatchData}
        onChange={handleMatchFormChange}
        onSubmit={() => handleCreateMatch(newMatchData)}
        isLoading={isLoading}
        error={createMatchError}
        isEditing={!!activeMatch}
      />
      
      {/* SoftUIConfirmationModal for clear teams confirmation */}
      <SoftUIConfirmationModal 
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearTeams}
        title="Clear Teams"
        message="Are you sure you want to clear all team assignments? This cannot be undone."
        confirmText="Clear Teams"
      />
      
      {/* Balance Options Modal using SoftUI styling */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity ${isBalanceModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-white rounded-xl shadow-soft-xl p-6 w-full max-w-md">
          <h2 className="text-lg font-bold text-slate-700 font-sans mb-4">Team Building Options</h2>
          
          <div className="mb-5">
            <p className="text-xs text-slate-500 mb-3">Choose how to build the teams:</p>
            
            <div className="space-y-2">
              <div 
                className={`p-2 border rounded-lg cursor-pointer ${balanceMethod === 'ability' ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
                onClick={() => setBalanceMethod('ability')}
              >
                <div className="flex items-center">
                  <div className={`w-3.5 h-3.5 rounded-full mr-2 ${balanceMethod === 'ability' ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'border border-gray-400'}`}></div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 font-sans">Balance by Ratings</h3>
                    <p className="text-xs text-slate-500">Balance players based on the ratings you've entered</p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-2 border rounded-lg cursor-pointer ${balanceMethod === 'performance' ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
                onClick={() => setBalanceMethod('performance')}
              >
                <div className="flex items-center">
                  <div className={`w-3.5 h-3.5 rounded-full mr-2 ${balanceMethod === 'performance' ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'border border-gray-400'}`}></div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 font-sans">Balance by Performance</h3>
                    <p className="text-xs text-slate-500">Balance players based on their actual performance</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`p-2 border rounded-lg cursor-pointer ${balanceMethod === 'random' ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
                onClick={() => setBalanceMethod('random')}
              >
                <div className="flex items-center">
                  <div className={`w-3.5 h-3.5 rounded-full mr-2 ${balanceMethod === 'random' ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'border border-gray-400'}`}></div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 font-sans">Random Assignment</h3>
                    <p className="text-xs text-slate-500">Create unpredictable teams with random player distribution</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="secondary"
              className="rounded-lg shadow-soft-sm"
              onClick={() => setIsBalanceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              className="bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md"
              onClick={proceedWithBalancing}
              disabled={isLoading || selectedPoolPlayers.length < ((activeMatch?.team_size || 9) * 2)}
            >
              {isLoading ? 'Processing...' : 'Build Teams'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTeamAlgorithm; 