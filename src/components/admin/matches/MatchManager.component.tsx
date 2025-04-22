import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';  // Import date-fns for date formatting
import { Card, Table, TableHead, TableBody, TableRow, TableCell, Button } from '@/components/ui-kit';
import { SoftUIConfirmationModal } from '@/components/ui-kit';

interface Player {
  player_id: number;
  name: string;
  is_retired?: boolean;
}

interface PlayerMatch {
  player_id: number;
  team: 'A' | 'B';
  goals: number;
}

interface Match {
  match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
  player_matches: PlayerMatch[];
}

interface TeamPlayer {
  player_id: string | number;
  goals: number;
}

interface FormData {
  match_date: string;
  team_a: TeamPlayer[];
  team_b: TeamPlayer[];
  team_a_score: number;
  team_b_score: number;
}

// Progress tracking interface
interface UpdateProgress {
  currentStep: string;
  percentComplete: number;
  isPolling: boolean;
  steps?: string[];
  error?: string | null;
}

const MatchManager: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [matchToDelete, setMatchToDelete] = useState<number | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [isUpdatingStats, setIsUpdatingStats] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress>({
    currentStep: '',
    percentComplete: 0,
    isPolling: false
  });
  
  // Reference to polling interval to clean up on unmount
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const defaultTeamState: TeamPlayer[] = Array(9).fill({ player_id: '', goals: 0 });

  const [formData, setFormData] = useState<FormData>({
    match_date: new Date().toISOString().split('T')[0],
    team_a: [...defaultTeamState],
    team_b: [...defaultTeamState],
    team_a_score: 0,
    team_b_score: 0,
  });

  // Fetch players and matches on component mount
  useEffect(() => {
    fetchPlayers();
    fetchMatches();
  }, []);

  const fetchPlayers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/players');
      const data = await response.json();
      console.log('Fetched players:', data.data);  // Debugging log
      if (data.data) {
        // Filter players where is_retired is false (not retired)
        setPlayers(data.data.filter((p: Player) => !p.is_retired));
      }
    } catch (error) {
      console.error('Error fetching players:', error);  // Debugging log
      setError('Failed to fetch players');
    }
  };

  const fetchMatches = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/matches');
      const data = await response.json();
      console.log('Fetched matches:', data.data);  // Debugging log
  
      if (data.data) {
        // Ensure data is an array before setting state
        if (Array.isArray(data.data)) {
          // Add more detailed logging to check player data
          data.data.forEach((match, index) => {
            console.log(`Match ${index} (ID: ${match.match_id}) - Player matches:`, 
              match.player_matches ? match.player_matches.length : 0);
          });
          
          setMatches(data.data);
        } else {
          console.error('Invalid matches data:', data.data);
          setError('Invalid matches data received');
        }
      } else {
        console.error('No matches data found:', data);
        setError('No matches data found');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);  // Debugging log
      setError('Failed to fetch matches');
    }
  };

  const handlePlayerChange = (team: 'a' | 'b', index: number, field: keyof TeamPlayer, value: string | number): void => {
    const newTeam = [...formData[`team_${team}`]];
    newTeam[index] = { ...newTeam[index], [field]: value };
    setFormData({ ...formData, [`team_${team}`]: newTeam });
  };

  const calculateTeamGoals = (team: 'a' | 'b'): number => {
    return formData[`team_${team}`].reduce((sum, player) => sum + (parseInt(String(player.goals)) || 0), 0);
  };

  const validateForm = (): boolean => {
    // Calculate total goals for Team A and Team B
    const teamAGoals = formData.team_a.reduce((sum, player) => sum + (parseInt(String(player.goals)) || 0), 0);
    const teamBGoals = formData.team_b.reduce((sum, player) => sum + (parseInt(String(player.goals)) || 0), 0);
  
    // Check if team scores match player goals
    if (teamAGoals !== parseInt(String(formData.team_a_score)) || 
        teamBGoals !== parseInt(String(formData.team_b_score))) {
      // Flag the discrepancy and ask for confirmation
      const message = `The total goals scored by players do not match the team scores.\n\n` +
                      `Team A: Players scored ${teamAGoals} goals, but the team score is ${formData.team_a_score}.\n` +
                      `Team B: Players scored ${teamBGoals} goals, but the team score is ${formData.team_b_score}.\n\n` +
                      `Do you want to save anyway?`;
      return window.confirm(message);  // Ask for confirmation
    }
  
    // Check for duplicate players
    const allPlayers = [
      ...formData.team_a.map(p => p.player_id),
      ...formData.team_b.map(p => p.player_id)
    ].filter(id => id); // Remove empty strings
  
    if (new Set(allPlayers).size !== allPlayers.length) {
      setError('A player cannot be in both teams');
      return false;
    }
  
    return true;
  };

  const updateStats = async (): Promise<void> => {
    // Immediately set updating states before API call to ensure UI feedback
    setIsUpdatingStats(true);
    setError('');
    
    // Reset progress state and ensure polling is active
    setUpdateProgress({
      currentStep: 'Initializing',
      percentComplete: 0,
      isPolling: true, // Force this to true immediately
      // Default steps that will be replaced when server provides actual steps
      steps: [
        'Initializing',
        'Fetching Configuration',
        'Updating Recent Performance',
        'Updating All-Time Stats',
        'Updating Season Honours',
        'Updating Half & Full Season Stats',
        'Updating Match Report Cache',
        'Completing Updates'
      ]
    });
    
    // Close the confirmation modal immediately
    setShowStatsModal(false);
    
    // For debugging
    console.log('Starting stats update, progress modal should be visible');
    
    // Clear any existing polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // Set a maximum duration failsafe - will force close the modal after 2 minutes
    // This prevents the UI from getting permanently stuck if something goes wrong
    const maxDurationTimer = setTimeout(() => {
      if (isUpdatingStats) {
        console.warn('Maximum update duration (2 minutes) reached - forcing modal to close');
        
        // Clean up all timers
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        setIsUpdatingStats(false);
        setUpdateProgress(prev => ({ 
          ...prev, 
          isPolling: false,
          percentComplete: 100,
          currentStep: 'Complete (Forced)'
        }));
        
        // Show a warning notification
        showNotification(
          'Process Timeout', 
          'The update is taking longer than expected. The UI has been reset, but the operation may still be running on the server.', 
          'warning'
        );
      }
    }, 120000); // 2 minutes
    
    // SUPER SIMPLE APPROACH:
    // Throw away all the complex step simulation and just use a basic incremental progress counter
    // that keeps ticking up steadily regardless of what the server is doing
    
    // Start an interval that updates progress every 300ms
    let progressInterval = setInterval(() => {
      setUpdateProgress(prev => {
        // If we're already at 100% or at 95%+ (waiting for final completion), don't increment
        if (prev.percentComplete >= 95) return prev;
        
        // Calculate the next increment (smaller as we get closer to 95%)
        const currentPercent = prev.percentComplete;
        let increment = 1;
        
        // Use dynamic increments - slower as we approach 95%
        if (currentPercent < 30) increment = 2;
        else if (currentPercent < 60) increment = 1.5;
        else if (currentPercent < 80) increment = 1;
        else increment = 0.5;
        
        // Limit to max 95% until we get confirmation from server
        const newPercent = Math.min(95, currentPercent + increment);
        
        // Update the step label based on percentage
        let newStep = prev.currentStep;
        if (currentPercent < 10 && newPercent >= 10) newStep = 'Fetching Configuration';
        else if (currentPercent < 25 && newPercent >= 25) newStep = 'Updating Recent Performance';
        else if (currentPercent < 45 && newPercent >= 45) newStep = 'Updating All-Time Stats';
        else if (currentPercent < 65 && newPercent >= 65) newStep = 'Updating Season Honours';
        else if (currentPercent < 80 && newPercent >= 80) newStep = 'Updating Half & Full Season Stats';
        else if (currentPercent < 90 && newPercent >= 90) newStep = 'Updating Match Report Cache';
        
        return {
          ...prev,
          percentComplete: newPercent,
          currentStep: newStep
        };
      });
    }, 300);
    
    // Function to clean up the progress interval
    const cleanupAnimation = () => {
      clearInterval(progressInterval);
    };
    
    try {
      // Start the update process
      const response = await fetch('/api/admin/run-postprocess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Send empty body as JSON
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Initial response data
      const initialData = await response.json();
      if (initialData.error) {
        throw new Error(initialData.error);
      }
      
      // Log initial data to help debug
      console.log('Initial process data:', initialData);
      
      // If it's already running, incorporate any server progress info
      if (initialData.progress) {
        // Don't go backwards in progress
        if (initialData.progress.percentComplete > 0) {
          setUpdateProgress(prev => ({
            ...prev,
            percentComplete: Math.max(prev.percentComplete, initialData.progress.percentComplete),
            currentStep: initialData.progress.currentStep || prev.currentStep,
            steps: initialData.progress.steps || prev.steps
          }));
        }
      }
      
      // Start polling for progress
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollResponse = await fetch('/api/admin/run-postprocess', {
            method: 'GET'
          });
          
          if (pollResponse.ok) {
            const progressData = await pollResponse.json();
            
            // For debugging
            console.log('Server progress update:', {
              step: progressData.currentStep,
              percent: progressData.percentComplete,
              isRunning: progressData.isRunning,
              steps: progressData.steps?.length || 0
            });
            
            // If the server reports meaningful progress, incorporate it (but don't go backwards)
            if (progressData.currentStep || progressData.percentComplete > 0) {
              setUpdateProgress(prev => ({
                ...prev,
                percentComplete: Math.max(prev.percentComplete, progressData.percentComplete),
                currentStep: progressData.currentStep || prev.currentStep,
                steps: progressData.steps || prev.steps
              }));
            }
            
            // If process is complete or errored, stop polling
            if (!progressData.isRunning) {
              // Clean up all timers
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              
              cleanupAnimation();
              
              // Clear the max duration failsafe
              clearTimeout(maxDurationTimer);
              
              // Complete progress to 100%
              setUpdateProgress(prev => ({
                ...prev,
                percentComplete: 100,
                currentStep: 'Complete'
              }));
              
              // Give a slight delay before removing the progress modal
              setTimeout(() => {
                // Only now set polling to false to remove progress modal
                setUpdateProgress(prev => ({ ...prev, isPolling: false }));
                setIsUpdatingStats(false);
                
                if (progressData.error) {
                  // Extract more detailed error information if available
                  let errorDetails = progressData.error;
                  let userMessage = `Update failed: ${progressData.error}`;
                  
                  // Check for transaction timeout errors
                  if (errorDetails.includes('Transaction API error') && 
                      (errorDetails.includes('transaction was 5000 ms') || 
                       errorDetails.includes('expired transaction'))) {
                    userMessage = 'The database operation timed out. Please try again when the server is less busy.';
                    console.error(`Transaction timeout error. Server-side fix required: Increase Prisma transaction timeout beyond 5000ms.`);
                  } else 
                  if (errorDetails.includes('SQL error') || errorDetails.includes('Prisma')) {
                    // Show a more user-friendly message for database errors
                    userMessage = `Database operation error. Please contact an administrator.`;
                    console.error(`SQL Error details: ${progressData.error}`);
                  }
                  
                  // Set the error message
                  setError(userMessage);
                  
                  // Only show error notifications, success is shown by progress bar completing
                  showNotification('Update Failed', userMessage, 'error');
                }
              }, 1000); // Slightly longer delay to show 100% completion
            }
          }
        } catch (pollError) {
          console.error('Error polling for progress:', pollError);
          
          // If polling fails, we still need to make sure the UI doesn't get stuck
          setTimeout(() => {
            if (updateProgress.percentComplete >= 95) {
              // Only now set polling to false to remove progress modal
              setUpdateProgress(prev => ({ 
                ...prev, 
                isPolling: false,
                percentComplete: 100,
                currentStep: 'Complete'
              }));
              setIsUpdatingStats(false);
            }
          }, 10000); // 10 second failsafe to prevent stuck UI
        }
      }, 1000); // Poll every second
      
    } catch (error) {
      console.error('Error updating stats:', error);
      
      // Clean up animation
      cleanupAnimation();
      
      // Clear the max duration failsafe
      clearTimeout(maxDurationTimer);
      
      let errorMessage = 'Failed to update stats';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
      // Make sure to set polling to false to hide progress indicator
      setUpdateProgress(prev => ({ ...prev, isPolling: false }));
      setIsUpdatingStats(false);
      
      // Show error in a styled notification
      showNotification('Update Failed', errorMessage, 'error');
    }
  };
  
  // Helper function to get a sensible step message based on progress percentage
  const getNextProgressStep = (progress: number): string => {
    if (progress < 10) return 'Initializing';
    if (progress < 25) return 'Fetching Configuration';
    if (progress < 40) return 'Updating Recent Performance';
    if (progress < 60) return 'Updating All-Time Stats';
    if (progress < 75) return 'Updating Season Honours';
    if (progress < 85) return 'Updating Half & Full Season Stats';
    if (progress < 95) return 'Updating Match Report Cache';
    return 'Completing Updates';
  };

  // Custom notification function that matches the app's UI style
  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Create notification element
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `fixed top-4 right-4 p-4 rounded-xl shadow-soft-xl z-[9999] flex items-center
      ${type === 'success' ? 'bg-gradient-to-tl from-green-600 to-lime-400 text-white' : 
        type === 'error' ? 'bg-gradient-to-tl from-red-600 to-rose-400 text-white' : 
        type === 'warning' ? 'bg-gradient-to-tl from-yellow-600 to-amber-400 text-white' : 
        'bg-gradient-to-tl from-blue-600 to-cyan-400 text-white'}`;
    
    // Add content
    notificationDiv.innerHTML = `
      <div class="mr-3">
        <div class="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
          ${type === 'success' ? 
            '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' :
            type === 'error' ? 
            '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>' :
            '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'}
        </div>
      </div>
      <div>
        <h4 class="font-bold text-sm">${title}</h4>
        <p class="text-xs opacity-90">${message}</p>
      </div>
      <button class="ml-4 opacity-70 hover:opacity-100" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
      </button>
    `;
    
    // Add to document
    document.body.appendChild(notificationDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        notificationDiv.remove();
      }
    }, 4000);
  };

  // Clean up polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
  
    // Validate the form
    const isValid = validateForm();
    if (!isValid) return;  // Stop if validation fails and user cancels
  
    setIsLoading(true);
    setError('');
  
    try {
      // Process players data and ensure player_id is a number
      const processedPlayers = [
        ...formData.team_a.map(p => ({ 
          ...p, 
          team: 'A' as const, 
          player_id: parseInt(String(p.player_id))  // Convert player_id to a number
        })),
        ...formData.team_b.map(p => ({ 
          ...p, 
          team: 'B' as const, 
          player_id: parseInt(String(p.player_id))  // Convert player_id to a number
        }))
      ].filter(p => p.player_id); // Remove empty player slots
  
      const matchData: {
        match_date: string;
        team_a_score: number;
        team_b_score: number;
        players: Array<{ player_id: number; team: 'A' | 'B'; goals: number }>;
        match_id?: number;
      } = {
        match_date: formData.match_date,
        team_a_score: parseInt(String(formData.team_a_score)),
        team_b_score: parseInt(String(formData.team_b_score)),
        players: processedPlayers,
      };
  
      if (selectedMatch) {
        matchData.match_id = selectedMatch.match_id;
      }
  
      const url = '/api/admin/matches';
      const method = selectedMatch ? 'PUT' : 'POST';
  
      console.log('Sending match data:', matchData);  // Debugging log
      
      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(matchData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear the timeout if request completes
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response error:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText || 'No error details'}`);
        }
  
        const data = await response.json();
        if (data.error) {
          console.error('API error:', data.error, data.details);
          throw new Error(data.error);
        }
  
        // Reset form and refresh matches
        setFormData({
          match_date: new Date().toISOString().split('T')[0],
          team_a: Array(9).fill(0).map(() => ({ player_id: '', goals: 0 })),
          team_b: Array(9).fill(0).map(() => ({ player_id: '', goals: 0 })),
          team_a_score: 0,
          team_b_score: 0,
        });
        setSelectedMatch(null);
        fetchMatches();
        
        // Show the stats update modal after successful match creation/update
        setShowStatsModal(true);
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - the server took too long to respond. Try again or check server logs.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error updating match:', error);  // Debugging log
      setError((error as Error).message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (match: Match): void => {
    setSelectedMatch(match);
    
    // Log detailed information about the match being edited
    console.log('Editing match:', {
      match_id: match.match_id,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
      player_matches_count: match.player_matches ? match.player_matches.length : 0,
      player_matches: match.player_matches
    });

    // Process players into team A and team B
    // Create arrays with independent objects to avoid reference issues
    const teamA: TeamPlayer[] = Array(9).fill(0).map(() => ({ player_id: '', goals: 0 }));
    const teamB: TeamPlayer[] = Array(9).fill(0).map(() => ({ player_id: '', goals: 0 }));
    
    if (!match.player_matches || match.player_matches.length === 0) {
      console.warn('No player matches found for this match!');
    } else {
      match.player_matches.forEach((pm, index) => {
        console.log(`Processing player match ${index}:`, pm);
        const team = pm.team === 'A' ? teamA : teamB;
        const emptySlot = team.findIndex(p => !p.player_id);
        if (emptySlot !== -1) {
          team[emptySlot] = {
            player_id: pm.player_id,
            goals: pm.goals,
          };
        } else {
          console.warn(`No empty slot found for player ${pm.player_id} in team ${pm.team}`);
        }
      });
    }

    console.log('Populated teams:', { 
      teamA: teamA.map(p => p.player_id ? p : null).filter(Boolean).length + ' players', 
      teamB: teamB.map(p => p.player_id ? p : null).filter(Boolean).length + ' players',
      teamA_raw: teamA,
      teamB_raw: teamB
    });

    setFormData({
      match_date: new Date(match.match_date).toISOString().split('T')[0],
      team_a: teamA,
      team_b: teamB,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
    });
  };

  const handleDeleteClick = (matchId: number): void => {
    setMatchToDelete(matchId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!matchToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/matches?matchId=${matchToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh matches after deletion
      fetchMatches();
      setShowDeleteModal(false);
      setMatchToDelete(null);
    } catch (error) {
      console.error('Error deleting match:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = (): void => {
    setShowDeleteModal(false);
    setMatchToDelete(null);
  };

  return (
    <div className="flex flex-col max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Form Card */}
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6 lg:mb-0 max-w-fit lg:flex-1">
          <div className="flex-auto p-6">
            <form onSubmit={handleSubmit}>
              {/* Match Date */}
              <div className="mb-4">
                <label className="mb-2 ml-1 text-xs font-bold text-slate-700">Match Date</label>
                <div className="relative max-w-xs">
                  <input
                    type="date"
                    value={formData.match_date}
                    onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                    className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap -mx-3 mb-6">
                {/* Team A */}
                <div className="w-full px-3 lg:w-1/2">
                  <div className="relative flex flex-col min-w-0 break-words bg-white rounded-xl border border-gray-200 bg-clip-border mb-4">
                    <div className="p-4 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-t-xl">
                      <h6 className="mb-0 font-bold text-white">Team A</h6>
                    </div>
                    <div className="flex-auto p-4">
                      {/* Player/Goals Header */}
                      <div className="flex mb-2">
                        <div className="w-3/4 pr-2">
                          <span className="text-xs font-bold text-slate-700 uppercase">Player</span>
                        </div>
                        <div className="w-1/4">
                          <span className="text-xs font-bold text-slate-700 uppercase">Goals</span>
                        </div>
                      </div>
                      
                      {formData.team_a.map((player, index) => (
                        <div key={`team-a-${index}`} className="flex flex-wrap mb-3">
                          <div className="w-3/4 pr-2">
                            <select
                              value={player.player_id}
                              onChange={(e) => handlePlayerChange('a', index, 'player_id', e.target.value)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                            >
                              <option value="">Select Player</option>
                              {players.map((p) => (
                                <option key={p.player_id} value={p.player_id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-1/4">
                            <input
                              type="number"
                              min="0"
                              value={player.goals}
                              onChange={(e) => handlePlayerChange('a', index, 'goals', parseInt(e.target.value) || 0)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="mt-4">
                        <label className="mb-2 ml-1 text-xs font-bold text-slate-700">Team A Score</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={formData.team_a_score}
                            onChange={(e) => setFormData({ ...formData, team_a_score: parseInt(e.target.value) || 0 })}
                            className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team B */}
                <div className="w-full px-3 lg:w-1/2">
                  <div className="relative flex flex-col min-w-0 break-words bg-white rounded-xl border border-gray-200 bg-clip-border mb-4">
                    <div className="p-4 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-t-xl">
                      <h6 className="mb-0 font-bold text-white">Team B</h6>
                    </div>
                    <div className="flex-auto p-4">
                      {/* Player/Goals Header */}
                      <div className="flex mb-2">
                        <div className="w-3/4 pr-2">
                          <span className="text-xs font-bold text-slate-700 uppercase">Player</span>
                        </div>
                        <div className="w-1/4">
                          <span className="text-xs font-bold text-slate-700 uppercase">Goals</span>
                        </div>
                      </div>
                      
                      {formData.team_b.map((player, index) => (
                        <div key={`team-b-${index}`} className="flex flex-wrap mb-3">
                          <div className="w-3/4 pr-2">
                            <select
                              value={player.player_id}
                              onChange={(e) => handlePlayerChange('b', index, 'player_id', e.target.value)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                            >
                              <option value="">Select Player</option>
                              {players.map((p) => (
                                <option key={p.player_id} value={p.player_id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-1/4">
                            <input
                              type="number"
                              min="0"
                              value={player.goals}
                              onChange={(e) => handlePlayerChange('b', index, 'goals', parseInt(e.target.value) || 0)}
                              className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="mt-4">
                        <label className="mb-2 ml-1 text-xs font-bold text-slate-700">Team B Score</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={formData.team_b_score}
                            onChange={(e) => setFormData({ ...formData, team_b_score: parseInt(e.target.value) || 0 })}
                            className="focus:shadow-soft-primary-outline text-sm leading-5.6 ease-soft block w-16 appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-2 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-fuchsia-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="my-4 p-3 bg-red-50 border border-red-100 text-red-500 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-block px-4 py-2 mr-3 font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
                >
                  {isLoading
                    ? 'Saving...'
                    : selectedMatch
                    ? 'Update Match'
                    : 'Add Match'}
                </button>

                {selectedMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMatch(null);
                      setFormData({
                        match_date: new Date().toISOString().split('T')[0],
                        team_a: [...defaultTeamState],
                        team_b: [...defaultTeamState],
                        team_a_score: 0,
                        team_b_score: 0,
                      });
                    }}
                    className="inline-block px-4 py-2 font-medium text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-300 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft hover:bg-slate-100 hover:scale-102 active:opacity-85 mr-3"
                  >
                    Cancel Edit
                  </button>
                )}
                
                {/* Update Stats button - styled like the Clear button in admin/next-match */}
                <button
                  type="button"
                  onClick={() => setShowStatsModal(true)}
                  disabled={isUpdatingStats}
                  className="text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg shadow-soft-sm px-4 py-2 font-medium text-center uppercase align-middle transition-all cursor-pointer text-xs"
                >
                  {isUpdatingStats ? 'Updating...' : 'Update Stats'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Match List */}
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border max-w-lg lg:max-w-none lg:flex-1">
          <div className="p-6 mb-0 bg-white border-b-0 rounded-t-2xl">
            <h6 className="mb-1 font-bold text-xl text-slate-700">Match History</h6>
            <p className="text-sm text-slate-500">View and manage past matches</p>
          </div>
          
          <div className="flex-auto p-6">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold text-left uppercase align-middle bg-white border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">Date</th>
                    <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">Score</th>
                    <th className="px-4 py-3 font-bold text-center uppercase align-middle bg-white border-b border-gray-200 shadow-none text-xxs border-b-solid tracking-none whitespace-nowrap text-slate-400 opacity-70">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-sm text-slate-500">
                        No matches found. Add a match to get started.
                      </td>
                    </tr>
                  ) : (
                    matches.map((match) => (
                      <tr key={match.match_id} className="hover:bg-slate-50">
                        <td className="p-2 align-middle bg-transparent whitespace-nowrap">
                          <p className="mb-0 font-semibold leading-tight text-sm">
                            {format(new Date(match.match_date), 'dd/MM/yyyy')}
                          </p>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent">
                          <span className="font-semibold text-slate-700">
                            {match.team_a_score} - {match.team_b_score}
                          </span>
                        </td>
                        <td className="p-2 text-center align-middle bg-transparent">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(match)}
                              className="inline-block px-2 py-1 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-200 rounded-lg shadow-none cursor-pointer hover:scale-102 active:opacity-85 hover:text-slate-800 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleDeleteClick(match.match_id)}
                              className="inline-block px-2 py-1 text-xs font-medium text-center text-white uppercase align-middle transition-all bg-transparent border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs leading-pro ease-soft-in tracking-tight-soft bg-gradient-to-tl from-red-500 to-orange-400 shadow-soft-md bg-150 bg-x-25"
                            >
                              DELETE
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={handleDeleteCancel} aria-hidden="true"></div>
            
            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6">
              {/* Modal content */}
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2" id="modal-title">Delete Match</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Are you sure you want to delete this match? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleDeleteCancel}
                    className="inline-block px-4 py-2 font-medium text-center text-slate-700 uppercase align-middle transition-all bg-transparent border border-slate-300 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft hover:bg-slate-100 hover:scale-102 active:opacity-85"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isLoading}
                    className="inline-block px-4 py-2 font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer text-xs ease-soft-in leading-pro tracking-tight-soft bg-gradient-to-tl from-red-500 to-orange-400 shadow-soft-md bg-150 bg-x-25 hover:scale-102 active:opacity-85"
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Update Confirmation Modal using SoftUIConfirmationModal */}
      <SoftUIConfirmationModal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          // Stop polling if modal is closed
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsUpdatingStats(false);
        }}
        onConfirm={updateStats}
        title="Update Player Statistics"
        message="This will recalculate all player statistics based on match data. This process may take a minute to complete. Do you want to continue?"
        confirmText={isUpdatingStats ? "Processing..." : "Update Stats"}
        cancelText="Cancel"
        isConfirming={isUpdatingStats}
        icon="warning"
      />

      {/* Separate progress indicator that appears when stats are updating */}
      {isUpdatingStats && updateProgress.isPolling && (
        <div className="fixed inset-0 z-[9999] overflow-auto flex items-center justify-center">
          {/* Semi-transparent background overlay */}
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50"></div>
          
          {/* Modal content */}
          <div className="bg-white p-6 rounded-xl shadow-soft-xl max-w-md w-full z-10 relative">
            {/* Emergency close button */}
            <button 
              onClick={() => {
                // Force cleanup all timers and state
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                setIsUpdatingStats(false);
                setUpdateProgress(prev => ({ ...prev, isPolling: false }));
                console.log('Emergency modal close triggered by user');
              }} 
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700"
              aria-label="Force close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Updating Player Statistics</h3>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-700">{updateProgress.currentStep}</span>
                <span className="font-medium text-slate-700">{Math.round(updateProgress.percentComplete)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-tl from-purple-700 to-pink-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${updateProgress.percentComplete}%` }}
                ></div>
              </div>
            </div>
            
            {/* Display step list if available */}
            {updateProgress.steps && updateProgress.steps.length > 0 && (
              <div className="mb-4 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                <h4 className="text-xs uppercase font-semibold text-slate-500 mb-2">PROCESS STEPS</h4>
                <ul className="text-sm space-y-2">
                  {updateProgress.steps.map((step, index) => {
                    // Determine step status - current, completed or pending
                    const isCurrent = step === updateProgress.currentStep;
                    const isCompleted = updateProgress.steps && updateProgress.currentStep 
                      ? updateProgress.steps.indexOf(updateProgress.currentStep) > index 
                      : false;
                    
                    return (
                    <li key={index} className={`flex items-center ${
                      isCurrent 
                        ? 'text-purple-600 font-medium' 
                        : isCompleted 
                          ? 'text-green-600' 
                          : 'text-slate-600'
                    }`}>
                      {isCurrent ? (
                        <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      ) : isCompleted ? (
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                      <span className="mr-2 text-xs bg-slate-100 text-slate-600 rounded-full w-5 h-5 inline-flex items-center justify-center">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-slate-500">This process may take a minute to complete. Please wait...</p>
              <div className="text-xs text-slate-400 italic">
                {updateProgress.percentComplete < 100 ? 
                  "If this seems stuck, the server might be busy. The X button in the corner can force-close this window." :
                  "Process completed. This window will close automatically."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManager; 