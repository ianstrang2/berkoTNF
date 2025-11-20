import React, { useState, useEffect, useRef, useCallback } from 'react';

import PlayerFormModal from './PlayerFormModal.component';
import { PendingJoinRequests } from './PendingJoinRequests.component';
import { ClubInviteLinkButton } from './ClubInviteLinkButton.component';

import { Club, PlayerProfile } from '@/types/player.types';
// React Query hook for automatic deduplication
import { usePlayersAdmin } from '@/hooks/queries/usePlayersAdmin.hook';
import { useAuth } from '@/hooks/useAuth.hook';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { apiFetch } from '@/lib/apiConfig';


// Extend PlayerProfile to include matches_played for this component's context
type PlayerWithMatchCount = PlayerProfile & {
  matches_played: number;
};



interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Default Person Icon SVG
const DefaultPlayerIcon = () => (
  <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </svg>
);

// Rating color helper function
const getRatingColor = (value: number): string => {
  switch (value) {
    case 1: return 'text-red-600 font-semibold'; // Red
    case 2: return 'text-orange-500 font-semibold'; // Orange  
    case 3: return 'text-yellow-500 font-semibold'; // Yellow
    case 4: return 'text-green-400 font-semibold'; // Light green
    case 5: return 'text-green-600 font-semibold'; // Strong green
    default: return 'text-gray-400 font-semibold';
  }
};

const PlayerManager: React.FC = () => {
  // ALL HOOKS MUST BE AT THE TOP (React rules!)
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showRetired, setShowRetired] = useState<boolean>(false);
  const { data: playersData = [], isLoading, error: queryError, refetch } = usePlayersAdmin(true, showRetired);
  
  // All useState hooks BEFORE any conditional returns
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'status',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPlayerModal, setShowPlayerModal] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithMatchCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [mobileView, setMobileView] = useState<'overview' | 'stats'>('overview');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  
  // Force refetch when tenantId becomes available (fixes cache race condition)
  useEffect(() => {
    if (profile.tenantId) {
      console.log('[PlayerManager] TenantId available, invalidating stale cache:', profile.tenantId);
      queryClient.invalidateQueries({ queryKey: queryKeys.playersAdmin(profile.tenantId, true, showRetired) });
    }
  }, [profile.tenantId, showRetired, queryClient]);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Derive state after all hooks
  const error = queryError ? (queryError as Error).message : '';
  const players: PlayerWithMatchCount[] = playersData.map((p: any) => ({
    ...p,
    id: String(p.id || p.player_id),
  }));
  
  // NOW we can have conditional returns (after ALL hooks)
  if (!profile.tenantId && profile.isAuthenticated) {
    return <div className="p-4 text-center">Loading tenant context...</div>;
  }

  const handleToggleAdmin = async (playerId: string, makeAdmin: boolean) => {
    if (!confirm(`Are you sure you want to ${makeAdmin ? 'promote this player to admin' : 'demote this admin to player'}?`)) {
      return;
    }

    try {
      const response = await apiFetch('/admin/players/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          is_admin: makeAdmin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin status');
      }

      // Refresh player list - React Query automatically refetches
      refetch();
      alert(data.message);
    } catch (err: any) {
      console.error('Error toggling admin:', err);
      setFormError(err.message || 'Failed to update admin status');
    }
  };

  const handleSubmitPlayer = async (formData: any): Promise<void> => {
    setIsSubmitting(true);
    setFormError('');

    try {
      const isEditing = !!selectedPlayer;
      const url = '/api/admin/players';
      const method = isEditing ? 'PUT' : 'POST';
      
      // The form gives us camelCase, the API expects snake_case for some fields
      const apiFormData = {
        ...formData,
        player_id: isEditing ? selectedPlayer.id : undefined,
        isAdmin: formData.isAdmin,
        is_ringer: formData.isRinger,
        is_retired: formData.isRetired,
        stamina_pace: formData.staminaPace,
        selected_club: formData.club,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditing ? 'Failed to update player' : 'Failed to add player'));
      }

      setShowPlayerModal(false);
      setSelectedPlayer(null);
      refetch(); // React Query refetch

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('That name already exists')) {
          setFormError(errorMessage);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (key: string): void => {
    // On mobile, only allow sorting on visible columns
    if (isMobile) {
      const overviewCols = ['name', 'status', 'ringer', 'played'];
      const statsCols = ['name', 'goalscoring', 'defending', 'staminaPace', 'control', 'teamwork', 'resilience'];
      const allowedCols = mobileView === 'overview' ? overviewCols : statsCols;
      
      if (!allowedCols.includes(key)) return;
    }
    
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortPlayers = (playersToSort: PlayerWithMatchCount[]): PlayerWithMatchCount[] => {
    return [...playersToSort].sort((a, b) => {
      if (sortConfig.key === 'status') {
        // Sort by status (active first) then by name
        if (a.isRetired === b.isRetired) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc' 
          ? (a.isRetired === true ? 1 : -1)
          : (a.isRetired === true ? -1 : 1);
      }
      
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortConfig.key === 'ringer') {
        // Sort by ringer status
        if (a.isRinger === b.isRinger) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? (a.isRinger === true ? 1 : -1)
          : (a.isRinger === true ? -1 : 1);
      }
      
      if (sortConfig.key === 'played') {
        // Sort by number of matches played
        if (a.matches_played === b.matches_played) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? a.matches_played - b.matches_played
          : b.matches_played - a.matches_played;
      }
      
      // Handle rating fields (goalscoring, defending, staminaPace, control, teamwork, resilience)
      const ratingFields = ['goalscoring', 'defending', 'staminaPace', 'control', 'teamwork', 'resilience'];
      if (ratingFields.includes(sortConfig.key)) {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue === bValue) {
          return a.name.localeCompare(b.name);
        }
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key === key) {
      return (
        <span className="ml-1 text-fuchsia-500">
          {sortConfig.direction === 'desc' ? '▼' : '▲'}
        </span>
      );
    }
    return null;
  };

  const filteredPlayers = sortPlayers(players).filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    // No need to filter by retired status since API handles this now
    return matchesSearch;
  });



  return (
    <>
      {/* Pending Join Requests - Separate card, appears first */}
      <PendingJoinRequests />
      
      <div className="bg-white rounded-2xl shadow-soft-xl p-6 lg:w-fit max-w-7xl">
        {/* Club Code Display - Compact single line */}
        {profile.clubCode && (
          <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">Your Club Code:</span>
                <span className="text-xl font-bold text-slate-700 tracking-widest font-mono">
                  {profile.clubCode}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(profile.clubCode!);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    } catch (err) {
                      console.error('Failed to copy:', err);
                    }
                  }}
                  className={`inline-block px-3 py-1.5 text-xs font-medium text-center uppercase align-middle transition-all rounded-lg cursor-pointer leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 ${
                    codeCopied
                      ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md border-0'
                      : 'text-slate-500 bg-white border border-slate-200 hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs shadow-none'
                  }`}
                  disabled={codeCopied}
                >
                {codeCopied ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : 'Copy Code'}
                </button>
                <ClubInviteLinkButton />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h5 className="font-bold text-slate-700">Player Manager</h5>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPlayerModal(true)}
              className="inline-block px-4 py-2 mb-0 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
            >
              Add Player
            </button>
          </div>
        </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-soft-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile View Toggle - Only on mobile */}
      {isMobile && (
        <div className="mb-4 flex justify-center">
          <div className="inline-flex bg-transparent border border-slate-300 rounded-full p-0.5">
            <button
              onClick={() => setMobileView('overview')}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                mobileView === 'overview'
                  ? 'bg-slate-200 text-slate-800'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setMobileView('stats')}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                mobileView === 'stats'
                  ? 'bg-slate-200 text-slate-800'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Stats
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-64">
          <div className="relative flex w-full flex-wrap items-stretch">
            <span className="z-10 h-full leading-snug font-normal text-center text-slate-300 absolute bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm focus:shadow-soft-primary-outline ease-soft leading-5.6 relative -ml-px block w-full min-w-0 rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding py-2 pr-3 text-gray-700 transition-all focus:border-fuchsia-300 focus:outline-none focus:transition-shadow"
            />
          </div>
        </div>
        <div className="flex items-center">
          <div className="min-h-6 mb-0.5 block pl-0">
            <input
              type="checkbox"
              id="showRetired"
              checked={showRetired}
              onChange={(e) => setShowRetired(e.target.checked)}
              className="mt-0.5 rounded-10 duration-250 ease-soft-in-out after:rounded-circle after:shadow-soft-2xl after:duration-250 checked:after:translate-x-5.3 h-5 relative float-left ml-auto w-10 cursor-pointer appearance-none border border-solid border-gray-200 bg-slate-800/10 bg-none bg-contain bg-left bg-no-repeat align-top transition-all after:absolute after:top-px after:h-4 after:w-4 after:translate-x-px after:bg-white after:content-[''] checked:border-slate-800/95 checked:bg-slate-800/95 checked:bg-none checked:bg-right"
            />
            <label htmlFor="showRetired" className="ml-2 text-sm text-slate-700 font-normal cursor-pointer">
              Show Retired
            </label>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">

          <thead className="align-bottom">
            <tr>
              {/* Name - Always visible */}
              <th onClick={() => handleSort('name')} className="cursor-pointer px-1 py-3 font-bold text-left uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Name {getSortIndicator('name')}
              </th>
              
              {/* Overview columns - Desktop always, Mobile only in overview mode */}
              {(!isMobile || mobileView === 'overview') && (
                <>
                  <th onClick={() => handleSort('status')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" title="Active or Retired">
                    ● {getSortIndicator('status')}
                  </th>
                  <th 
                    className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-help" 
                    title="Profile claimed?"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert('Profile Claimed?\n\nIndicates whether the player has claimed their profile and can log in to the app/web.');
                    }}
                  >
                    🔗
                  </th>
                  <th 
                    className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70 cursor-help" 
                    title="App downloaded?"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert('App Downloaded?\n\nIndicates whether the player has downloaded and used the mobile app (can receive push notifications).');
                    }}
                  >
                    📱
                  </th>
                  <th onClick={() => handleSort('ringer')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70" title="Guest status">
                    🎯 {getSortIndicator('ringer')}
                  </th>
                  <th onClick={() => handleSort('played')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    Played {getSortIndicator('played')}
                  </th>
                </>
              )}
              
              {/* Club - Desktop only */}
              {!isMobile && (
                <th className="px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                  Club
                </th>
              )}
              
              {/* Stats columns - Desktop always, Mobile only in stats mode */}
              {(!isMobile || mobileView === 'stats') && (
                <>
                  <th onClick={() => handleSort('goalscoring')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    GOL {getSortIndicator('goalscoring')}
                  </th>
                  <th onClick={() => handleSort('defending')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    DEF {getSortIndicator('defending')}
                  </th>
                  <th onClick={() => handleSort('staminaPace')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    S&P {getSortIndicator('staminaPace')}
                  </th>
                  <th onClick={() => handleSort('control')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    CTL {getSortIndicator('control')}
                  </th>
                  <th onClick={() => handleSort('teamwork')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    TMW {getSortIndicator('teamwork')}
                  </th>
                  <th onClick={() => handleSort('resilience')} className="cursor-pointer px-1 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                    RES {getSortIndicator('resilience')}
                  </th>
                </>
              )}
              
              {/* Actions - Always visible */}
              <th className="px-2 py-3 font-bold text-center uppercase align-middle bg-transparent border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="p-2 text-center align-middle bg-transparent border-b">
                  <div className="flex justify-center items-center py-4">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                    </div>
                    <span className="ml-2">Loading players...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={14} className="p-2 text-center align-middle bg-transparent border-b">
                  <div className="py-4 text-slate-500">No players found</div>
                </td>
              </tr>
            ) : (
              filteredPlayers.map(player => (
                    <tr key={player.id}>
                      {/* Name - Always visible */}
                      <td className="p-2 align-middle bg-transparent border-b">
                        <h6 className="mb-0 leading-normal text-sm">{player.name}</h6>
                      </td>
                      
                      {/* Overview columns - Desktop always, Mobile only in overview mode */}
                      {(!isMobile || mobileView === 'overview') && (
                        <>
                          <td 
                            className="p-2 text-center align-middle bg-transparent border-b cursor-help" 
                            title={player.isRetired ? 'Retired player' : 'Active player'}
                            onClick={(e) => {
                              e.stopPropagation();
                              const message = player.isRetired 
                                ? `Retired Player\n\n${player.name} is retired and will not appear in match selection. Their historical stats are preserved.`
                                : `Active Player\n\n${player.name} is active and available for match selection.`;
                              alert(message);
                            }}
                          >
                            <span className={`text-lg ${player.isRetired ? 'text-red-500' : 'text-green-500'}`}>
                              ●
                            </span>
                          </td>
                          <td 
                            className="p-2 text-center align-middle bg-transparent border-b cursor-help" 
                            title={player.authUserId ? 'Profile claimed' : 'Not claimed'}
                            onClick={(e) => {
                              e.stopPropagation();
                              const message = player.authUserId 
                                ? 'Profile Claimed\n\nThis player has claimed their profile and can log in to the web app or mobile app.'
                                : 'Profile Not Claimed\n\nThis player has not claimed their profile yet. They cannot log in until they verify their phone number.';
                              alert(message);
                            }}
                          >
                            <span className={`text-lg ${player.authUserId ? 'text-green-500' : 'text-gray-300'}`}>
                              🔗
                            </span>
                          </td>
                          <td 
                            className="p-2 text-center align-middle bg-transparent border-b cursor-help" 
                            title="Mobile app usage tracking coming soon"
                          >
                            <span className="text-lg text-gray-300">
                              📱
                            </span>
                          </td>
                          <td 
                            className="p-2 text-center align-middle bg-transparent border-b cursor-help" 
                            title={player.isRinger ? 'Guest player' : 'Regular player'}
                            onClick={(e) => {
                              e.stopPropagation();
                              const message = player.isRinger 
                                ? `Guest Player\n\n${player.name} is a guest. Their stats are not included in league tables or records.`
                                : `Regular Player\n\n${player.name} is a regular club member whose stats count towards all league tables and records.`;
                              alert(message);
                            }}
                          >
                            <span className={`text-lg ${player.isRinger ? 'text-blue-500' : 'text-gray-300'}`}>
                              ●
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className="font-medium text-sm">
                              {player.matches_played || 0}
                            </span>
                          </td>
                        </>
                      )}
                      
                      {/* Club - Desktop only */}
                      {!isMobile && (
                        <td className="p-2 align-middle bg-transparent border-b text-center">
                          <div className="flex justify-center items-center">
                            {player.club ? (
                              <img 
                                src={`/club-logos-40px/${player.club.filename}`} 
                                alt={player.club.name} 
                                className="h-6 w-6" 
                                title={player.club.name}
                              />
                            ) : (
                              <DefaultPlayerIcon />
                            )}
                          </div>
                        </td>
                      )}
                      
                      {/* Stats columns - Desktop always, Mobile only in stats mode */}
                      {(!isMobile || mobileView === 'stats') && (
                        <>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className={getRatingColor(player.goalscoring)}>
                              {player.goalscoring}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className={getRatingColor(player.defending)}>
                              {player.defending}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className={getRatingColor(player.staminaPace)}>
                              {player.staminaPace}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className={getRatingColor(player.control)}>
                              {player.control}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className={getRatingColor(player.teamwork)}>
                              {player.teamwork}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle bg-transparent border-b">
                            <span className={getRatingColor(player.resilience)}>
                              {player.resilience}
                            </span>
                          </td>
                        </>
                      )}
                      
                      {/* Actions - Always visible */}
                      <td className="p-2 text-center align-middle bg-transparent border-b">
                        <button
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowPlayerModal(true);
                          }}
                          className="inline-block px-3 py-1.5 text-xs font-medium text-center text-slate-500 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25">
                          EDIT
                        </button>
                      </td>
                    </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Player Form Modal - for adding and editing players */}
      <PlayerFormModal 
        isOpen={showPlayerModal}
        onClose={() => {
          setShowPlayerModal(false);
          setSelectedPlayer(null); // Clear selected player when closing modal
          setFormError(''); // Clear any general errors when modal is closed by user
        }}
        onSubmit={handleSubmitPlayer}
        isProcessing={isSubmitting}
        initialData={selectedPlayer ? {
          name: selectedPlayer.name,
          phone: selectedPlayer.phone ?? undefined,
          isAdmin: selectedPlayer.isAdmin,
          authUserId: selectedPlayer.authUserId,
          isRinger: selectedPlayer.isRinger,
          isRetired: selectedPlayer.isRetired,
          goalscoring: selectedPlayer.goalscoring,
          defending: selectedPlayer.defending,
          staminaPace: selectedPlayer.staminaPace,
          control: selectedPlayer.control,
          teamwork: selectedPlayer.teamwork,
          resilience: selectedPlayer.resilience,
          club: selectedPlayer.club ?? undefined,
        } : undefined}
        title={selectedPlayer ? "Edit Player" : "Add New Player"}
        submitButtonText={selectedPlayer ? "Save Changes" : "Create Player"}
      />
      </div>
    </>
  );
};

export default PlayerManager; 