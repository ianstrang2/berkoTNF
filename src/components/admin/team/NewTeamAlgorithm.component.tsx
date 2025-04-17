import React, { useState } from 'react';
import { useTeamAlgorithm } from '@/hooks/useTeamAlgorithm';
import { useBalanceWeights } from '@/hooks/useBalanceWeights';
import { formatDateSafely } from '@/utils/team-algorithm.utils';
import PlayerPool from '@/components/team/PlayerPool.component';
import TeamSection from '@/components/team/TeamSection.component';
import TornadoChart from '@/components/team/TornadoChart.component';
import ComparativeStats from '@/components/team/ComparativeStats.component';
import RingerModal from '@/components/team/modals/RingerModal.component';
import MatchModal from '@/components/team/modals/MatchModal.component';
import ConfirmDialog from '@/components/team/modals/ConfirmDialog.component';

const NewTeamAlgorithm: React.FC = () => {
  // State for balance options modal
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceMethod, setBalanceMethod] = useState<'ability' | 'random'>('ability');
  
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
    ringerForm,
    isMatchModalOpen,
    newMatchData,
    isClearConfirmOpen,
    isLoading,
    selectedPoolPlayers,
    orangePositionGroups,
    greenPositionGroups,
    draggedItem,
    highlightedSlot,
    selectedSlot,
    orangeTeamStats,
    greenTeamStats,
    comparativeStats,
    createMatchError,
    copySuccess,
    pendingPlayerToggles,
    
    // Actions
    setIsRingerModalOpen,
    setIsMatchModalOpen,
    setIsClearConfirmOpen,
    handleRingerFormChange,
    handleMatchFormChange,
    handleAddRinger,
    handleCreateMatch,
    handleClearTeams,
    confirmClearTeams,
    handleTogglePoolPlayer,
    handleAssignPoolPlayers,
    handleBalanceTeams,
    handleCopyTeams,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSlotTap,
    selectPlayer,
    getAvailablePlayers
  } = useTeamAlgorithm();
  
  // Balance teams using the selected method
  const proceedWithBalancing = async () => {
    // Close the modal first
    setIsBalanceModalOpen(false);
    
    // Call the balance function with the selected method
    await handleBalanceTeams(balanceMethod);
  };
  
  return (
    <div className="flex flex-col max-w-7xl">
      {/* SECTION 1: Match setup and player pool */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
        {/* Header information */}
        {activeMatch && (
          <div className="p-4 border-b">
            <div className="text-lg font-semibold">
              Match: {formatDateSafely(activeMatch.match_date)}
            </div>
            <div className="text-sm text-gray-600">
              Format: {activeMatch.team_size}v{activeMatch.team_size}
            </div>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        {/* Match management buttons */}
        <div className="p-4 flex flex-wrap gap-2">
          <button
            onClick={() => setIsMatchModalOpen(true)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            {activeMatch ? 'Edit Match' : 'Create Match'}
          </button>
        </div>
        
        {/* Player pool */}
        <div className="p-4">
          <PlayerPool 
            allPlayers={players}
            selectedPlayers={selectedPoolPlayers}
            onTogglePlayer={handleTogglePoolPlayer}
            teamSize={activeMatch?.team_size || 9}
            onBalanceTeams={() => handleBalanceTeams('ability')}
            isBalancing={isLoading && balanceProgress > 0}
            maxPlayers={(activeMatch?.team_size || 9) * 2} // Maximum players allowed
            pendingPlayers={pendingPlayerToggles}
          />
          
          {/* Player management buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={handleClearTeams}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
            >
              Clear
            </button>
            
            <button 
              onClick={() => setIsRingerModalOpen(true)}
              disabled={selectedPoolPlayers.length >= (activeMatch?.team_size || 9) * 2}
              className={`px-4 py-2 ${selectedPoolPlayers.length >= (activeMatch?.team_size || 9) * 2 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded`}
            >
              Create Player
            </button>
          </div>
        </div>
      </div>
      
      {/* Build Teams button (between sections) */}
      <div className="flex justify-center mb-6">
        <button 
          onClick={() => setIsBalanceModalOpen(true)}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg text-white font-semibold ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          Build Teams
        </button>
      </div>
      
      {/* Progress bar for balancing */}
      {isLoading && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full animate-pulse"
              style={{ width: '50%' }}
            ></div>
          </div>
        </div>
      )}
      
      {/* SECTION 2: Team display */}
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border">
        {/* Team copy button */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Teams</h2>
            </div>
            <button 
              onClick={handleCopyTeams}
              disabled={!currentSlots.some(slot => slot.player_id !== null)}
              className={`px-4 py-2 ${copySuccess ? 'bg-green-500 text-white' : currentSlots.some(slot => slot.player_id !== null) ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-100 text-gray-500 cursor-not-allowed'} rounded transition-colors duration-200`}
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        {/* Teams display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
          {/* Orange Team */}
          <div>
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
              getAvailablePlayers={getAvailablePlayers}
              isReadOnly={isBalanced} // Make read-only when balanced
            />
          </div>
          
          {/* Green Team */}
          <div>
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
              getAvailablePlayers={getAvailablePlayers}
              isReadOnly={isBalanced} // Make read-only when balanced
            />
          </div>
        </div>
        
        {/* Team Stats Comparison */}
        {orangeTeamStats && greenTeamStats && (
          <div className="px-4 pb-4">
            <TornadoChart 
              teamAStats={orangeTeamStats} 
              teamBStats={greenTeamStats} 
              weights={formattedWeights}
            />
          </div>
        )}
        
        {/* Comparative stats */}
        {comparativeStats && (
          <div className="px-4 pb-4">
            <ComparativeStats stats={comparativeStats} />
          </div>
        )}
      </div>
      
      {/* Modals */}
      <RingerModal 
        isOpen={isRingerModalOpen}
        onClose={() => setIsRingerModalOpen(false)}
        form={ringerForm}
        onChange={handleRingerFormChange}
        onSubmit={handleAddRinger}
        isLoading={isLoading}
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
      
      <ConfirmDialog 
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={confirmClearTeams}
        title="Clear Teams"
        message="Are you sure you want to clear all team assignments? This cannot be undone."
        confirmText="Clear Teams"
        isDangerous={true}
      />
      
      {/* Balance Options Modal */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity ${isBalanceModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Team Building Options</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">Choose how to build the teams:</p>
            
            <div className="space-y-3">
              <div 
                className={`p-3 border rounded-md cursor-pointer ${balanceMethod === 'ability' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => setBalanceMethod('ability')}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${balanceMethod === 'ability' ? 'bg-blue-500' : 'border border-gray-400'}`}></div>
                  <div>
                    <h3 className="font-medium">Balance by Ability</h3>
                    <p className="text-sm text-gray-600">Create evenly matched teams based on player ratings</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`p-3 border rounded-md cursor-pointer ${balanceMethod === 'random' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => setBalanceMethod('random')}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${balanceMethod === 'random' ? 'bg-blue-500' : 'border border-gray-400'}`}></div>
                  <div>
                    <h3 className="font-medium">Random Teams</h3>
                    <p className="text-sm text-gray-600">Randomly assign players to teams</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 border rounded-md cursor-not-allowed opacity-50">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full border border-gray-400 mr-3"></div>
                  <div>
                    <h3 className="font-medium">Title Race (Coming Soon)</h3>
                    <p className="text-sm text-gray-600">Create teams based on race positions</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 border rounded-md cursor-not-allowed opacity-50">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full border border-gray-400 mr-3"></div>
                  <div>
                    <h3 className="font-medium">New Combinations (Coming Soon)</h3>
                    <p className="text-sm text-gray-600">Create teams with players who haven't played together</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsBalanceModalOpen(false)}
              className="px-4 py-2 border rounded-md text-gray-700"
            >
              Cancel
            </button>
            <button 
              onClick={proceedWithBalancing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Build Teams'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTeamAlgorithm; 