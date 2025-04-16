TeamAlgorithm Component Refactoring Plan
Overview
This document outlines a comprehensive refactoring plan for the TeamAlgorithm component to improve performance, usability, and maintainability while supporting current and future functionality including notification systems and multiple active matches.

## Preserving the Balancing Algorithm

The existing team balancing algorithm is a core feature that must be preserved exactly as-is. The refactoring will:

1. **Extract, Not Rewrite**: The existing TeamBalanceService will be extracted intact without modifying its logic.

2. **Maintain All Weighting Factors**: All player attribute weightings used in the algorithm (goalscoring, defending, stamina_pace, control, teamwork, resilience) will remain identical.

3. **Preserve Position-Specific Logic**: The position-specific balancing considerations (defenders, midfielders, attackers) will be maintained exactly as in the original code.

4. **Keep Slot-Based Assignment**: The algorithm's slot-based assignment system (slots 1-9 for Orange team, 10-18 for Green team) will be preserved.

5. **Retain Balance Quality Calculations**: The logic for calculating balance scores and quality ratings (Excellent, Good, Fair, Poor) will remain unchanged.

When implementing the TeamAPIService balanceTeamsByAbility function, it will directly invoke the existing TeamBalanceService.balanceTeams method to ensure identical balancing results.

The only new addition will be the random balancing algorithm, which will be implemented as a separate method without modifying the existing ability-based algorithm.


Database Changes
I will implement these database changes myself in Supabase:

-- Create a new table for managing the player pool
CREATE TABLE match_player_pool (
  id SERIAL PRIMARY KEY,
  upcoming_match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  response_status VARCHAR(20) NOT NULL DEFAULT 'IN', -- 'IN', 'OUT', 'MAYBE', 'PENDING'
  response_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_timestamp TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(upcoming_match_id, player_id),
  FOREIGN KEY (upcoming_match_id) REFERENCES upcoming_matches(upcoming_match_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id)
);

-- Add index for faster queries
CREATE INDEX idx_match_player_pool_match_id ON match_player_pool(upcoming_match_id);
CREATE INDEX idx_match_player_pool_player_id ON match_player_pool(player_id);

Current Issues

The component is extremely large (1000+ lines) and complex
Performance issues when adding/removing players
Unclear separation between player pool and final team assignments
Complex state management with tightly coupled logic

## Comprehensive Functionality Preservation

To ensure a complete and successful refactoring, we must carefully preserve ALL existing functionality:

1. **Core Balancing Functionality**: As described in the "Preserving the Balancing Algorithm" section above, the team balancing algorithm will be preserved exactly as-is.

2. **Player Selection & Management**: 
   - Player pool selection with search functionality
   - Accurate player count validation for match format
   - Player attribute display and visualization

3. **Team Display & Interaction**:
   - Position-based team display (defenders, midfielders, attackers)
   - Drag and drop player movement between slots
   - Slot selection and tapping functionality for mobile devices
   - Team statistics visualization
   - Balance quality indicators (Excellent, Good, Fair, Poor)

4. **Match Management**:
   - Match creation and editing
   - Match date and team size configuration
   - Active match selection
   - Match clearing vs. slot clearing distinction

5. **Special Features**:
   - Ringer creation and management
   - Team copying with proper formatting
   - Team statistics comparison

## Database Access & Structure

The refactoring will preserve the existing database tables while adding a new player pool table:

1. **Player Attribute Storage**:
   - Player attributes (goalscoring, defending, stamina_pace, control, teamwork, resilience) will continue to be stored in the `players` table
   - These attributes will be accessed through the API and used exactly as in the current implementation

2. **Match Data Structure**:
   - Match details will remain in the `upcoming_matches` table
   - Team assignments will remain in the `upcoming_match_players` table (slot assignments)
   - The new `match_player_pool` table will handle player availability for matches

3. **Database Operations**:
   - Match creation: Insert into `upcoming_matches` with match_date, team_size
   - Match editing: Update `upcoming_matches` with new date or team size
   - Player pool management: Insert/delete from `match_player_pool`
   - Team assignments: Insert/update/delete from `upcoming_match_players`

4. **Data Relationships**:
   - One match to many pool players (match_player_pool)
   - One match to many team assignments (upcoming_match_players)
   - One player to many pool entries and team assignments

## Error Handling & Edge Cases

The refactored implementation will include comprehensive error handling to ensure reliability:

1. **API Error Handling**:
   - All API calls will include proper error boundaries and retries
   - Failed API responses will include detailed error messages
   - Status codes will be checked and appropriate actions taken
   - Network failures will be detected and user-friendly messages displayed

2. **Balance Algorithm Fallbacks**:
   - If the primary balance algorithm API fails, a fallback mechanism will be implemented
   - The TeamBalanceService's performBasicTeamBalance method will be preserved as a fallback
   - Multiple retry attempts with exponential backoff for transient errors

3. **Empty Slot Handling**:
   - Drag and drop operations will properly handle empty source/target slots
   - UI will visually distinguish empty slots and provide appropriate feedback
   - Prevent invalid drop operations that would result in data inconsistency

4. **Validation & Safeguards**:
   - Team size validation for different formation patterns
   - Player count validation before attempting to balance teams
   - Preventing duplicate player assignments
   - Type checking and validation for all user inputs

5. **Fallback Mechanisms**:
   - Clipboard API fallback for older browsers
   - Local state recovery if server operations fail
   - Graceful degradation for non-critical features

## Additional Components

To ensure all current functionality is preserved, we will add these additional components to the refactoring plan:

### 1. Ringer Creation Component

```typescript
// RingerFormModal.tsx
const RingerFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddRinger: (ringerData: RingerFormData) => Promise<void>;
  isLoading: boolean;
}> = ({ isOpen, onClose, onAddRinger, isLoading }) => {
  const [formData, setFormData] = useState<RingerFormData>({
    name: '',
    goalscoring: 3,
    defending: 3,
    stamina_pace: 3,
    control: 3,
    teamwork: 3,
    resilience: 3
  });

  const handleChange = (field: keyof RingerFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddRinger(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Ringer Player</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Name field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Player Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          {/* Player attributes with sliders */}
          {['goalscoring', 'defending', 'stamina_pace', 'control', 'teamwork', 'resilience'].map(attr => (
            <div key={attr} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {attr.charAt(0).toUpperCase() + attr.slice(1).replace('_', '/')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData[attr as keyof RingerFormData]}
                  onChange={(e) => handleChange(attr as keyof RingerFormData, parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <span className="text-sm w-10 text-right">
                  {typeof formData[attr as keyof RingerFormData] === 'number' 
                    ? formData[attr as keyof RingerFormData].toFixed(1) 
                    : formData[attr as keyof RingerFormData]}
                </span>
              </div>
            </div>
          ))}
          
          {/* Submit button */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Ringer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 2. Match Management Components

```typescript
// MatchFormModal.tsx
const MatchFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (matchData: MatchFormData) => Promise<void>;
  isLoading: boolean;
  initialData?: MatchFormData;
  isEdit?: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading, initialData, isEdit = false }) => {
  const [formData, setFormData] = useState<MatchFormData>(initialData || {
    match_date: new Date().toISOString().split('T')[0],
    team_size: 5
  });

  const handleChange = (field: keyof MatchFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? 'Edit Match' : 'Create New Match'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Match date field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Date
            </label>
            <input
              type="date"
              value={formData.match_date}
              onChange={(e) => handleChange('match_date', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          {/* Team size field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Size
            </label>
            <select
              value={formData.team_size}
              onChange={(e) => handleChange('team_size', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value={5}>5v5</option>
              <option value={6}>6v6</option>
              <option value={7}>7v7</option>
              <option value={8}>8v8</option>
              <option value={9}>9v9</option>
              <option value={11}>11v11</option>
            </select>
          </div>
          
          {/* Submit button */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (isEdit ? 'Update Match' : 'Create Match')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 3. Team Stats Component

```typescript
// TeamStats.tsx
const TeamStats: React.FC<{
  slots: Slot[];
  players: Player[];
  teamType: 'orange' | 'green';
}> = ({ slots, players, teamType }) => {
  // Calculate team statistics
  const calculateTeamStats = () => {
    // Filter out slots without player assignments
    const slotsWithPlayers = slots.filter(slot => slot.player_id);
    if (slotsWithPlayers.length === 0) return null;
    
    // Get player objects for all assigned slots
    const teamPlayers = slotsWithPlayers
      .map(slot => players.find(p => p.id === slot.player_id))
      .filter(Boolean) as Player[];
    
    if (teamPlayers.length === 0) return null;
    
    const calculateAvg = (field: keyof Player) => {
      const sum = teamPlayers.reduce((total, player) => total + (Number(player[field]) || 0), 0);
      return teamPlayers.length > 0 ? sum / teamPlayers.length : 0;
    };
    
    return {
      goalscoring: calculateAvg('goalscoring'),
      defending: calculateAvg('defending'),
      stamina_pace: calculateAvg('stamina_pace'),
      control: calculateAvg('control'),
      teamwork: calculateAvg('teamwork'),
      resilience: calculateAvg('resilience'),
      playerCount: teamPlayers.length
    };
  };

  const stats = calculateTeamStats();
  if (!stats) return null;

  const teamColor = teamType === 'orange' ? 'orange' : 'green';
  const teamDisplayName = teamType === 'orange' ? 'Orange Team' : 'Green Team';

  return (
    <div className="bg-white rounded-md shadow p-3 mb-4">
      <h3 className={`text-lg font-bold ${teamType === 'orange' ? 'text-orange-600' : 'text-emerald-600'}`}>
        {teamDisplayName} ({stats.playerCount} players)
      </h3>
      
      <div className="mt-2">
        {Object.entries(stats).map(([key, value]) => {
          if (key === 'playerCount') return null;
          
          return (
            <div key={key} className="flex items-center gap-1 mt-1">
              <span className="text-sm text-gray-700 w-24">
                {key.charAt(0).toUpperCase() + key.slice(1).replace('_', '/')}:
              </span>
              <div className="flex-grow bg-gray-200 h-4 rounded-md overflow-hidden">
                <div 
                  className={`h-full ${teamType === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${(value / 5) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-700 w-10 text-right">
                {typeof value === 'number' ? value.toFixed(1) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### 4. Match Action Buttons Component

```typescript
// MatchActionButtons.tsx
const MatchActionButtons: React.FC<{
  onCreateMatch: () => void;
  onEditMatch: () => void;
  onClearMatch: () => void;
  hasActiveMatch: boolean;
  isLoading: boolean;
}> = ({ 
  onCreateMatch, 
  onEditMatch, 
  onClearMatch, 
  hasActiveMatch, 
  isLoading 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-md font-semibold mr-2">Match Actions:</h3>
        
        {/* Create new match */}
        <button
          onClick={onCreateMatch}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm"
        >
          Create New Match
        </button>
        
        {/* Edit match - only enabled if there's an active match */}
        <button
          onClick={onEditMatch}
          disabled={!hasActiveMatch || isLoading}
          className={`px-3 py-1.5 rounded-md text-sm ${
            hasActiveMatch && !isLoading
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Edit Match
        </button>
        
        {/* Clear match - only enabled if there's an active match */}
        <button
          onClick={onClearMatch}
          disabled={!hasActiveMatch || isLoading}
          className={`px-3 py-1.5 rounded-md text-sm ${
            hasActiveMatch && !isLoading
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Clear Match
        </button>
      </div>
    </div>
  );
};
```

## Enhanced API Service

The API service will be expanded to include all necessary operations:

```typescript
// Enhanced TeamAPI.service.ts
export const TeamAPIService = {
  // Player pool APIs
  fetchPlayerPool: async (matchId: string): Promise<PoolPlayer[]> => {
    try {
      const response = await fetch(`/api/admin/match-player-pool?match_id=${matchId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch player pool: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching player pool:', error);
      throw error;
    }
  },
  
  addPlayerToPool: async (matchId: string, playerId: string): Promise<void> => {
    try {
      const response = await fetch('/api/admin/match-player-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, player_id: playerId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add player: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding player to pool:', error);
      throw error;
    }
  },
  
  removePlayerFromPool: async (matchId: string, playerId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/match-player-pool?match_id=${matchId}&player_id=${playerId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove player: ${response.status}`);
      }
    } catch (error) {
      console.error('Error removing player from pool:', error);
      throw error;
    }
  },
  
  // Team assignment APIs
  fetchTeamAssignments: async (matchId: string): Promise<Slot[]> => {
    try {
      const response = await fetch(`/api/admin/upcoming-match-players?match_id=${matchId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch team assignments: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching team assignments:', error);
      throw error;
    }
  },
  
  assignPlayerToSlot: async (matchId: string, playerId: string, slotNumber: number, team: string): Promise<void> => {
    try {
      const response = await fetch('/api/admin/upcoming-match-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          player_id: playerId,
          team,
          slot_number: slotNumber
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to assign player: ${response.status}`);
      }
    } catch (error) {
      console.error('Error assigning player to slot:', error);
      throw error;
    }
  },
  
  // Team balancing APIs with retries and fallbacks
  balanceTeamsByAbility: async (matchId: string, playerIds: string[]): Promise<any> => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/admin/balance-planned-match?matchId=${matchId}`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        // For 400 errors, don't retry
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to balance teams: ${response.status}`);
        }
        
        // For 500 errors, retry
        attempts++;
        if (attempts >= maxAttempts) {
          // If final attempt, use fallback
          console.warn('Using fallback balance method after failed attempts');
          return await TeamBalanceService.performBasicTeamBalance(matchId);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          console.warn('Using fallback balance method after caught errors');
          return await TeamBalanceService.performBasicTeamBalance(matchId);
        }
        
        // Wait before retrying
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
      }
    }
  },
  
  balanceTeamsRandomly: async (matchId: string, playerIds: string[]): Promise<any> => {
    try {
      const response = await fetch(`/api/admin/random-balance-match?matchId=${matchId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        // For random balancing, implement a client-side fallback
        console.warn('Random balance API failed, using client-side fallback');
        return await TeamAPIService.performClientSideRandomBalance(matchId, playerIds);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in random team balance:', error);
      // Fallback to client-side random balancing
      return await TeamAPIService.performClientSideRandomBalance(matchId, playerIds);
    }
  },
  
  // Client-side fallback for random balancing
  performClientSideRandomBalance: async (matchId: string, playerIds: string[]): Promise<any> => {
    try {
      // Fetch current match data to get team size
      const matchResponse = await fetch(`/api/admin/upcoming-matches?id=${matchId}`);
      const matchData = await matchResponse.json();
      if (!matchData.success) throw new Error('Failed to fetch match data');
      
      const teamSize = matchData.data.team_size || 9;
      
      // Shuffle player IDs
      const shuffledPlayerIds = [...playerIds].sort(() => Math.random() - 0.5);
      
      // Split into teams
      const teamA = shuffledPlayerIds.slice(0, teamSize);
      const teamB = shuffledPlayerIds.slice(teamSize);
      
      // Create slot assignments
      const slotAssignments = [];
      
      for (let i = 0; i < teamA.length; i++) {
        slotAssignments.push({
          player_id: teamA[i],
          team: 'A',
          slot_number: i + 1
        });
      }
      
      for (let i = 0; i < teamB.length; i++) {
        slotAssignments.push({
          player_id: teamB[i],
          team: 'B',
          slot_number: i + teamSize + 1
        });
      }
      
      // Update each player's team assignment
      for (const assignment of slotAssignments) {
        await TeamAPIService.assignPlayerToSlot(
          matchId, 
          assignment.player_id, 
          assignment.slot_number, 
          assignment.team
        );
      }
      
      // Mark match as balanced
      await fetch(`/api/admin/upcoming-matches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upcoming_match_id: matchId,
          is_balanced: true
        })
      });
      
      return {
        success: true,
        data: {
          slots: slotAssignments.map(a => ({
            slot_number: a.slot_number,
            player_id: a.player_id,
            team: a.team
          })),
          stats: {
            balanceType: 'random',
            balanceQuality: 'Random'
          }
        }
      };
    } catch (error) {
      console.error('Error in client-side random balance:', error);
      throw error;
    }
  },
  
  // Clear all slot assignments but keep the match
  clearTeamAssignments: async (matchId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/upcoming-match-players/clear?matchId=${matchId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to clear team assignments: ${response.status}`);
      }
    } catch (error) {
      console.error('Error clearing team assignments:', error);
      throw error;
    }
  },
  
  // Clear the active match entirely
  clearActiveMatch: async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/clear-active-match', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to clear active match: ${response.status}`);
      }
    } catch (error) {
      console.error('Error clearing active match:', error);
      throw error;
    }
  },
  
  // Create a new match
  createMatch: async (matchData: MatchFormData): Promise<void> => {
    try {
      const response = await fetch('/api/admin/create-planned-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: matchData.match_date,
          team_size: matchData.team_size
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create match: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  },
  
  // Edit an existing match
  updateMatch: async (matchId: string, matchData: MatchFormData): Promise<void> => {
    try {
      const response = await fetch('/api/admin/upcoming-matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          match_date: matchData.match_date,
          team_size: matchData.team_size
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update match: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  },
  
  // Add a ringer player
  addRinger: async (ringerData: RingerFormData): Promise<Player> => {
    try {
      const response = await fetch('/api/admin/add-ringer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ringerData.name,
          goalscoring: parseFloat(ringerData.goalscoring.toString()),
          defending: parseFloat(ringerData.defending.toString()),
          stamina_pace: parseFloat(ringerData.stamina_pace.toString()),
          control: parseFloat(ringerData.control.toString()),
          teamwork: parseFloat(ringerData.teamwork.toString()),
          resilience: parseFloat(ringerData.resilience.toString())
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add ringer: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error adding ringer:', error);
      throw error;
    }
  }
};
```

New Architecture Overview
The refactored implementation will feature:

Clear separation between player pool and team assignments
Multiple balancing algorithms (current algorithm, random, plus future options)
Improved performance with optimized rendering and state management
Modular code structure for better maintainability

Component Structure
1. Types Module (types/team-algorithm.types.ts)
// Player interfaces
export interface Player {
  id: string;
  name: string;
  goalscoring?: number;
  defending?: number;
  stamina_pace?: number;
  control?: number;
  teamwork?: number;
  resilience?: number;
  is_ringer?: boolean;
  is_retired?: boolean;
  [key: string]: any;
}

export interface PoolPlayer extends Player {
  response_status?: 'IN' | 'OUT' | 'MAYBE' | 'PENDING';
}

// Slot and position interfaces
export interface Slot {
  slot_number: number;
  player_id: string | null;
  team?: string;
  position?: string | null;
}

// All other types
// ... (the rest of the types from the original component)

2. API Service (services/TeamAPI.service.ts)
export const TeamAPIService = {
  // Player pool APIs
  fetchPlayerPool: async (matchId: string): Promise<PoolPlayer[]> => {
    // Fetch players from match_player_pool
  },
  
  addPlayerToPool: async (matchId: string, playerId: string): Promise<void> => {
    // Add player to match_player_pool
  },
  
  removePlayerFromPool: async (matchId: string, playerId: string): Promise<void> => {
    // Remove player from match_player_pool
  },
  
  // Team assignment APIs
  fetchTeamAssignments: async (matchId: string): Promise<Slot[]> => {
    // Fetch players from upcoming_match_players
  },
  
  assignPlayerToSlot: async (matchId: string, playerId: string, slotNumber: number, team: string): Promise<void> => {
    // Assign player to specific slot in upcoming_match_players
  },
  
  // Team balancing APIs
  balanceTeamsByAbility: async (matchId: string, playerIds: string[]): Promise<Slot[]> => {
    // Call existing balance endpoint
  },
  
  balanceTeamsRandomly: async (matchId: string, playerIds: string[]): Promise<Slot[]> => {
    // New endpoint for random balancing
  },
  
  clearTeamAssignments: async (matchId: string): Promise<void> => {
    // Clear all slot assignments
  }
}

3. State Hooks
a. Player Pool Hook (hooks/usePlayerPool.ts)
export const usePlayerPool = (matchId: string) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [poolPlayers, setPoolPlayers] = useState<PoolPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load all players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        // Fetch all players and player pool
        const allPlayersResponse = await fetch(`/api/admin/players`);
        const poolPlayersResponse = await TeamAPIService.fetchPlayerPool(matchId);
        
        // Process data
        // ...
        
        setPlayers(allPlayersData);
        setPoolPlayers(poolPlayersData);
      } catch (error) {
        setError(`Failed to load players: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlayers();
  }, [matchId]);
  
  // Add player to pool
  const addPlayerToPool = useCallback(async (playerId: string) => {
    try {
      await TeamAPIService.addPlayerToPool(matchId, playerId);
      // Update local state
    } catch (error) {
      setError(`Failed to add player: ${error}`);
    }
  }, [matchId]);
  
  // Remove player from pool
  const removePlayerFromPool = useCallback(async (playerId: string) => {
    try {
      await TeamAPIService.removePlayerFromPool(matchId, playerId);
      // Update local state
    } catch (error) {
      setError(`Failed to remove player: ${error}`);
    }
  }, [matchId]);
  
  return {
    players,
    poolPlayers,
    isLoading,
    error,
    addPlayerToPool,
    removePlayerFromPool
  };
};

b. Team Assignments Hook (hooks/useTeamAssignments.ts)
export const useTeamAssignments = (matchId: string, teamSize: number = 9) => {
  const [slots, setSlots] = useState<Slot[]>(Array(teamSize * 2).fill(null).map((_, i) => ({
    slot_number: i + 1,
    player_id: null,
    team: i < teamSize ? 'A' : 'B'
  })));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceStats, setBalanceStats] = useState<any>(null);
  
  // Load team assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const assignments = await TeamAPIService.fetchTeamAssignments(matchId);
        setSlots(assignments);
      } catch (error) {
        setError(`Failed to load team assignments: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssignments();
  }, [matchId]);
  
  // Balance teams with selected algorithm
  const balanceTeams = useCallback(async (playerIds: string[], algorithm: 'ability' | 'random' = 'ability') => {
    try {
      setIsLoading(true);
      let result;
      
      if (algorithm === 'random') {
        result = await TeamAPIService.balanceTeamsRandomly(matchId, playerIds);
      } else {
        result = await TeamAPIService.balanceTeamsByAbility(matchId, playerIds);
      }
      
      setSlots(result.slots);
      setBalanceStats(result.stats);
    } catch (error) {
      setError(`Failed to balance teams: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);
  
  // Move player between slots
  const movePlayer = useCallback(async (sourceSlotNumber: number, targetSlotNumber: number) => {
    try {
      setIsLoading(true);
      // Implement slot swapping logic
      // ...
    } catch (error) {
      setError(`Failed to move player: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [slots, matchId]);
  
  return {
    slots,
    isLoading,
    error,
    balanceStats,
    balanceTeams,
    movePlayer
  };
};

4. UI Components
a. Player Pool Component (components/team/PlayerPool.tsx)

const PlayerPool: React.FC<{
  players: Player[];
  poolPlayers: PoolPlayer[];
  onAddPlayer: (id: string) => void;
  onRemovePlayer: (id: string) => void;
  isLoading: boolean;
  teamSize: number;
}> = ({ players, poolPlayers, onAddPlayer, onRemovePlayer, isLoading, teamSize }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.is_retired)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, searchTerm]);
  
  // Check if player is in pool
  const isInPool = (playerId: string) => poolPlayers.some(p => p.id === playerId);
  
  // Check if we have correct number of players
  const exactPlayersNeeded = teamSize * 2;
  const hasCorrectPlayerCount = poolPlayers.length === exactPlayersNeeded;
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-3">Player Pool</h2>
      
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>
      
      {/* Player count indicator */}
      <div className="flex justify-between mb-3">
        <span className={`text-sm ${hasCorrectPlayerCount ? 'text-green-600' : 'text-amber-600'}`}>
          {poolPlayers.length} of {exactPlayersNeeded} players needed
        </span>
      </div>
      
      {/* Player list */}
      <div className="border rounded-md overflow-hidden">
        {filteredPlayers.map(player => (
          <div 
            key={player.id}
            className={`flex items-center px-4 py-2 border-b cursor-pointer hover:bg-gray-50 ${
              isInPool(player.id) ? 'bg-blue-50' : ''
            }`}
            onClick={() => isInPool(player.id) ? onRemovePlayer(player.id) : onAddPlayer(player.id)}
          >
            <input
              type="checkbox"
              checked={isInPool(player.id)}
              onChange={() => {}}
              className="mr-3"
            />
            <span className="flex-grow">{player.name}</span>
          </div>
        ))}
      </div>
      
      {/* Helper message */}
      {!hasCorrectPlayerCount && (
        <p className="text-sm text-amber-600 mt-2">
          {poolPlayers.length < exactPlayersNeeded 
            ? `Select ${exactPlayersNeeded - poolPlayers.length} more players.`
            : `Remove ${poolPlayers.length - exactPlayersNeeded} players.`}
        </p>
      )}
    </div>
  );
};

b. Team Formation Controls (components/team/TeamFormationControls.tsx)

const TeamFormationControls: React.FC<{
  onBalanceTeams: (algorithm: 'ability' | 'random') => void;
  onClearTeams: () => void;
  onCopyTeams: () => void;
  hasCorrectPlayerCount: boolean;
  isLoading: boolean;
}> = ({ 
  onBalanceTeams, 
  onClearTeams, 
  onCopyTeams, 
  hasCorrectPlayerCount, 
  isLoading 
}) => {
  const [algorithm, setAlgorithm] = useState<'ability' | 'random'>('ability');
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Algorithm selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Balance Method:
          </label>
          <select 
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as 'ability' | 'random')}
            className="rounded-md border-gray-300 shadow-sm"
            disabled={isLoading}
          >
            <option value="ability">Balance by Ability</option>
            <option value="random">Random Teams</option>
            <option value="title" disabled>Title Race (Coming Soon)</option>
            <option value="combos" disabled>New Combinations (Coming Soon)</option>
          </select>
        </div>
        
        <div className="flex-grow" />
        
        {/* Action buttons */}
        <button
          onClick={() => onBalanceTeams(algorithm)}
          disabled={!hasCorrectPlayerCount || isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            hasCorrectPlayerCount && !isLoading 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Balancing...' : 'Balance Teams'}
        </button>
        
        <button
          onClick={onCopyTeams}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={isLoading}
        >
          Copy Teams
        </button>
        
        <button
          onClick={onClearTeams}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={isLoading}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

c. Team Display (components/team/TeamDisplay.tsx)

const TeamDisplay: React.FC<{
  slots: Slot[];
  players: Player[];
  teamSize: number;
  onMovePlayer: (sourceSlot: number, targetSlot: number) => void;
  isLoading: boolean;
}> = ({ slots, players, teamSize, onMovePlayer, isLoading }) => {
  
  // Get player data from slot
  const getPlayerFromSlot = (slot: Slot) => {
    if (!slot.player_id) return null;
    return players.find(p => p.id === slot.player_id) || null;
  };
  
  // Determine position groups
  const getPositionGroups = (isOrangeTeam: boolean) => {
    const baseSlot = isOrangeTeam ? 1 : teamSize + 1;
    
    // Adjust based on team size
    let defenderCount, midfielderCount, attackerCount;
    
    if (teamSize <= 5) {
      defenderCount = 2;
      midfielderCount = 2;
      attackerCount = 1;
    } else if (teamSize <= 7) {
      defenderCount = 2;
      midfielderCount = 3;
      attackerCount = teamSize - 5;
    } else if (teamSize <= 9) {
      defenderCount = 3;
      midfielderCount = 4;
      attackerCount = teamSize - 7;
    } else {
      defenderCount = 4;
      midfielderCount = 4;
      attackerCount = teamSize - 8;
    }
    
    return {
      defenders: {
        title: 'Defenders',
        slots: Array.from({ length: defenderCount }, (_, i) => baseSlot + i)
      },
      midfielders: {
        title: 'Midfielders',
        slots: Array.from({ length: midfielderCount }, (_, i) => baseSlot + defenderCount + i)
      },
      attackers: {
        title: 'Attackers',
        slots: Array.from({ length: attackerCount }, (_, i) => baseSlot + defenderCount + midfielderCount + i)
      }
    };
  };
  
  const orangePositions = getPositionGroups(true);
  const greenPositions = getPositionGroups(false);
  
  // Split slots by team
  const orangeSlots = slots.filter(s => s.slot_number <= teamSize);
  const greenSlots = slots.filter(s => s.slot_number > teamSize && s.slot_number <= teamSize * 2);
  
  // Drag and drop state
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  
  // Render player slot
  const renderPlayerSlot = (slot: Slot, position: string) => {
    const player = getPlayerFromSlot(slot);
    const isOrangeTeam = slot.slot_number <= teamSize;
    
    return (
      <div 
        key={`slot-${slot.slot_number}`}
        className={`p-3 rounded-md ${
          player 
            ? isOrangeTeam ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200'
        } border mb-2`}
        draggable={!!player && !isLoading}
        onDragStart={(e) => {
          if (isLoading) return;
          e.dataTransfer.setData('slotNumber', String(slot.slot_number));
          setDraggedSlot(slot.slot_number);
        }}
        onDragOver={(e) => {
          if (isLoading) return;
          e.preventDefault();
        }}
        onDragEnter={(e) => {
          if (isLoading) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (isLoading) return;
          e.preventDefault();
          const sourceSlot = parseInt(e.dataTransfer.getData('slotNumber'));
          onMovePlayer(sourceSlot, slot.slot_number);
          setDraggedSlot(null);
        }}
        onDragEnd={() => {
          setDraggedSlot(null);
        }}
      >
        {player ? (
          <div className="flex items-center">
            <span className="flex-grow">{player.name}</span>
            <span className="text-sm text-gray-500">
              {position === 'Defenders' ? '🛡️' : position === 'Midfielders' ? '⚙️' : '⚽'}
            </span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-center">Empty slot</div>
        )}
      </div>
    );
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Orange Team */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-orange-600 text-white p-3">
          <h3 className="text-xl font-bold">Orange Team</h3>
        </div>
        
        <div className="p-4">
          {/* Defenders */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Defenders</h4>
            {orangePositions.defenders.slots.map(slotNumber => {
              const slot = slots.find(s => s.slot_number === slotNumber);
              if (!slot) return null;
              return renderPlayerSlot(slot, 'Defenders');
            })}
          </div>
          
          {/* Midfielders */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Midfielders</h4>
            {orangePositions.midfielders.slots.map(slotNumber => {
              const slot = slots.find(s => s.slot_number === slotNumber);
              if (!slot) return null;
              return renderPlayerSlot(slot, 'Midfielders');
            })}
          </div>
          
          {/* Attackers */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Attackers</h4>
            {orangePositions.attackers.slots.map(slotNumber => {
              const slot = slots.find(s => s.slot_number === slotNumber);
              if (!slot) return null;
              return renderPlayerSlot(slot, 'Attackers');
            })}
          </div>
        </div>
      </div>
      
      {/* Green Team - Similar structure */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-emerald-600 text-white p-3">
          <h3 className="text-xl font-bold">Green Team</h3>
        </div>
        
        <div className="p-4">
          {/* Defenders */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Defenders</h4>
            {greenPositions.defenders.slots.map(slotNumber => {
              const slot = slots.find(s => s.slot_number === slotNumber);
              if (!slot) return null;
              return renderPlayerSlot(slot, 'Defenders');
            })}
          </div>
          
          {/* Midfielders */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Midfielders</h4>
            {greenPositions.midfielders.slots.map(slotNumber => {
              const slot = slots.find(s => s.slot_number === slotNumber);
              if (!slot) return null;
              return renderPlayerSlot(slot, 'Midfielders');
            })}
          </div>
          
          {/* Attackers */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Attackers</h4>
            {greenPositions.attackers.slots.map(slotNumber => {
              const slot = slots.find(s => s.slot_number === slotNumber);
              if (!slot) return null;
              return renderPlayerSlot(slot, 'Attackers');
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

5. Main Component Implementation

const TeamAlgorithm: React.FC = () => {
  // Get active match data
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch active match
  useEffect(() => {
    const fetchActiveMatch = async () => {
      try {
        const response = await fetch('/api/admin/upcoming-matches?active=true');
        if (!response.ok) throw new Error('Failed to fetch active match');
        
        const data = await response.json();
        if (data.success && data.data) {
          setActiveMatch(data.data);
        }
      } catch (error) {
        setError(`Failed to load match: ${error}`);
      }
    };
    
    fetchActiveMatch();
  }, []);
  
  // Use custom hooks for player pool and team assignments
  const { 
    players, 
    poolPlayers, 
    addPlayerToPool, 
    removePlayerFromPool 
  } = usePlayerPool(activeMatch?.upcoming_match_id);
  
  const {
    slots,
    isLoading,
    balanceStats,
    balanceTeams,
    movePlayer
  } = useTeamAssignments(activeMatch?.upcoming_match_id, activeMatch?.team_size);
  
  // State for match management
  const [showCreateMatchModal, setShowCreateMatchModal] = useState<boolean>(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState<boolean>(false);
  const [showClearMatchConfirm, setShowClearMatchConfirm] = useState<boolean>(false);
  const [isMatchActionLoading, setIsMatchActionLoading] = useState<boolean>(false);
  
  // State for ringer management
  const [showRingerModal, setShowRingerModal] = useState<boolean>(false);
  const [isAddingRinger, setIsAddingRinger] = useState<boolean>(false);
  
  // State for clear team confirmations
  const [showClearTeamsConfirm, setShowClearTeamsConfirm] = useState<boolean>(false);
  
  // Handle team balance
  const handleBalanceTeams = async (algorithm: 'ability' | 'random') => {
    if (poolPlayers.length !== (activeMatch?.team_size || 9) * 2) {
      setError('You need exactly the right number of players to balance teams');
      return;
    }
    
    try {
    await balanceTeams(poolPlayers.map(p => p.id), algorithm);
    } catch (error) {
      setError(`Team balancing failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Show fallback options if automatic balancing fails
      if (confirm('Automatic balancing failed. Would you like to try the basic balance method?')) {
        try {
          if (activeMatch?.upcoming_match_id) {
            await TeamBalanceService.performBasicTeamBalance(activeMatch.upcoming_match_id);
            // Refresh data after basic balance
            window.location.reload();
          }
        } catch (fallbackError) {
          setError(`Fallback balancing also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      }
    }
  };
  
  // Handle copy to clipboard with proper formatting and fallbacks
  const handleCopyTeams = () => {
    const formatTeam = (teamSlots: Slot[]) => {
      return teamSlots
        .filter(slot => slot.player_id)
        .map(slot => {
          const player = players.find(p => p.id === slot.player_id);
          return player ? player.name : '';
        })
        .filter(name => name)
        .join('\n');
    };

    const orangeTeam = slots.filter(s => s.slot_number <= (activeMatch?.team_size || 9));
    const greenTeam = slots.filter(s => s.slot_number > (activeMatch?.team_size || 9));

    // Format teams with clear headers and separation
    const teamText = `ORANGE TEAM\n${formatTeam(orangeTeam)}\n\nGREEN TEAM\n${formatTeam(greenTeam)}`;
    
    // Try to use modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(teamText)
      .then(() => {
        alert('Teams copied to clipboard');
      })
      .catch(err => {
          // Fallback for older browsers or if clipboard access is denied
          fallbackCopyTeams(teamText);
        });
    } else {
      // Fallback for non-secure contexts or older browsers
      fallbackCopyTeams(teamText);
    }
  };
  
  // Fallback copy method using document.execCommand for older browsers
  const fallbackCopyTeams = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      textArea.remove();
      
      if (successful) {
        alert('Teams copied to clipboard');
      } else {
        // If execCommand fails, show a modal with the text to manually copy
        showCopyModal(text);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      showCopyModal(text);
    }
  };
  
  // Show modal for manual copying
  const showCopyModal = (text: string) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-white p-6 rounded-lg shadow-lg max-w-md w-full';
    content.innerHTML = `
      <h3 class="text-xl font-bold mb-4">Copy Teams</h3>
      <p class="text-gray-600 mb-4">Please select and copy the text below:</p>
      <pre class="bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap mb-4">${text}</pre>
      <div class="flex justify-end">
        <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800" onclick="this.closest('.fixed').remove()">
          Close
        </button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
  };
  
  // Handle clear slots (just team assignments)
  const handleClearTeams = async () => {
    try {
      if (!activeMatch?.upcoming_match_id) return;
      
      await TeamAPIService.clearTeamAssignments(activeMatch.upcoming_match_id);
      
      // Refresh team assignments
      const { fetchAssignments } = useTeamAssignments(activeMatch.upcoming_match_id, activeMatch.team_size);
      await fetchAssignments();
      
      setShowClearTeamsConfirm(false);
    } catch (error) {
      setError(`Failed to clear teams: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle clear active match (entire match)
  const handleClearMatch = async () => {
    try {
      setIsMatchActionLoading(true);
      await TeamAPIService.clearActiveMatch();
      
      // Reset local state
      setActiveMatch(null);
      setShowClearMatchConfirm(false);
      
      // Clear local storage data if any
      localStorage.removeItem('lastTeamBalance');
    } catch (error) {
      setError(`Failed to clear match: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsMatchActionLoading(false);
    }
  };
  
  // Handle create match
  const handleCreateMatch = async (matchData: MatchFormData) => {
    try {
      setIsMatchActionLoading(true);
      await TeamAPIService.createMatch(matchData);
      
      // Reload to get fresh data
      window.location.reload();
    } catch (error) {
      setError(`Failed to create match: ${error instanceof Error ? error.message : String(error)}`);
      setIsMatchActionLoading(false);
    }
  };
  
  // Handle edit match
  const handleEditMatch = async (matchData: MatchFormData) => {
    if (!activeMatch?.upcoming_match_id) return;
    
    try {
      setIsMatchActionLoading(true);
      await TeamAPIService.updateMatch(activeMatch.upcoming_match_id, matchData);
      
      // Reload to get fresh data
      window.location.reload();
    } catch (error) {
      setError(`Failed to update match: ${error instanceof Error ? error.message : String(error)}`);
      setIsMatchActionLoading(false);
    }
  };
  
  // Handle add ringer
  const handleAddRinger = async (ringerData: RingerFormData) => {
    try {
      setIsAddingRinger(true);
      const newRinger = await TeamAPIService.addRinger(ringerData);
      
      // Add the new ringer to the players list
      const updatedPlayers = [...players, newRinger];
      // We need to update the players state - this would be handled in usePlayerPool hook
      
      setShowRingerModal(false);
    } catch (error) {
      setError(`Failed to add ringer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAddingRinger(false);
    }
  };
  
  // Function to handle drag-and-drop player movements
  const handleMovePlayer = async (sourceSlotNumber: number, targetSlotNumber: number) => {
    if (!activeMatch?.upcoming_match_id) return;
    
    try {
      // Handle the empty slot case
      const sourceSlot = slots.find(s => s.slot_number === sourceSlotNumber);
      const targetSlot = slots.find(s => s.slot_number === targetSlotNumber);
      
      if (!sourceSlot || !targetSlot) {
        throw new Error('Invalid slot operation');
      }
      
      // If source slot is empty, nothing to do
      if (!sourceSlot.player_id) {
        return;
      }
      
      await movePlayer(sourceSlotNumber, targetSlotNumber);
    } catch (error) {
      setError(`Failed to move player: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      {activeMatch ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Match: {new Date(activeMatch.match_date).toLocaleDateString()}
          </h1>
          <p>Format: {activeMatch.team_size}v{activeMatch.team_size}</p>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Team Algorithm</h1>
          <p className="text-gray-600">No active match. Create a match to begin.</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
          <p className="text-red-700">{error}</p>
              <button 
                className="text-red-500 hover:text-red-700 text-sm mt-1"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Match actions */}
      <MatchActionButtons
        onCreateMatch={() => setShowCreateMatchModal(true)}
        onEditMatch={() => setShowEditMatchModal(true)}
        onClearMatch={() => setShowClearMatchConfirm(true)}
        hasActiveMatch={!!activeMatch}
        isLoading={isMatchActionLoading}
      />
      
      {/* Add Ringer button */}
      <div className="mb-6">
        <button
          onClick={() => setShowRingerModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Add Ringer Player
        </button>
      </div>
      
      {/* Player Pool */}
      <PlayerPool
        players={players}
        poolPlayers={poolPlayers}
        onAddPlayer={addPlayerToPool}
        onRemovePlayer={removePlayerFromPool}
        isLoading={isLoading}
        teamSize={activeMatch?.team_size || 9}
      />
      
      {/* Team Formation Controls */}
      <TeamFormationControls
        onBalanceTeams={handleBalanceTeams}
        onClearTeams={() => setShowClearTeamsConfirm(true)}
        onCopyTeams={handleCopyTeams}
        hasCorrectPlayerCount={poolPlayers.length === (activeMatch?.team_size || 9) * 2}
        isLoading={isLoading}
      />
      
      {/* Team Display */}
      <TeamDisplay
        slots={slots}
        players={players}
        teamSize={activeMatch?.team_size || 9}
        onMovePlayer={handleMovePlayer}
        isLoading={isLoading}
      />
      
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <TeamStats
          slots={slots.filter(s => s.slot_number <= (activeMatch?.team_size || 9))}
          players={players}
          teamType="orange"
        />
        <TeamStats
          slots={slots.filter(s => s.slot_number > (activeMatch?.team_size || 9))}
          players={players}
          teamType="green"
        />
      </div>
      
      {/* Balance Stats */}
      {balanceStats && (
        <div className="mt-6 bg-white rounded-md shadow p-4">
          <h3 className="text-lg font-bold mb-2">Team Balance Analysis</h3>
          
          <div className="mb-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Balance Quality:</span>
              <span className={`font-semibold ${
                balanceStats.balanceQuality === 'Excellent' ? 'text-green-600' :
                balanceStats.balanceQuality === 'Good' ? 'text-blue-600' :
                balanceStats.balanceQuality === 'Fair' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {balanceStats.balanceQuality}
              </span>
            </div>
            
            {/* Balance quality visual indicator */}
            <div className="relative h-2.5 w-full bg-gray-200 rounded-full overflow-hidden mt-1">
              <div 
                className={`absolute top-0 left-0 h-full ${
                  balanceStats.balanceScore <= 0.3 ? 'bg-green-500' :
                  balanceStats.balanceScore <= 0.6 ? 'bg-blue-500' :
                  balanceStats.balanceScore <= 0.9 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.max(0, 100 - (balanceStats.balanceScore * 100))}%`,
                  transition: 'width 0.5s ease-out'
                }}
              />
            </div>
          </div>
          
          {/* Attribute differences */}
          <div className="mt-3">
            <div className="text-sm text-gray-700 mb-1">Attribute Differences:</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(balanceStats.diffs || {}).map(([key, value]) => {
                const label = key.charAt(0).toUpperCase() + key.replace('_', '/').slice(1);
                const diffClass = 
                  Number(value) <= 0.3 ? 'text-green-600' :
                  Number(value) <= 0.6 ? 'text-blue-600' :
                  Number(value) <= 0.9 ? 'text-amber-600' : 'text-red-600';
                
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm">{label}:</span>
                    <span className={`text-sm font-medium ${diffClass}`}>
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      {/* Create Match Modal */}
      <MatchFormModal
        isOpen={showCreateMatchModal}
        onClose={() => setShowCreateMatchModal(false)}
        onSubmit={handleCreateMatch}
        isLoading={isMatchActionLoading}
        isEdit={false}
      />
      
      {/* Edit Match Modal */}
      <MatchFormModal
        isOpen={showEditMatchModal}
        onClose={() => setShowEditMatchModal(false)}
        onSubmit={handleEditMatch}
        isLoading={isMatchActionLoading}
        isEdit={true}
        initialData={activeMatch ? {
          match_date: new Date(activeMatch.match_date).toISOString().split('T')[0],
          team_size: activeMatch.team_size
        } : undefined}
      />
      
      {/* Add Ringer Modal */}
      <RingerFormModal
        isOpen={showRingerModal}
        onClose={() => setShowRingerModal(false)}
        onAddRinger={handleAddRinger}
        isLoading={isAddingRinger}
      />
      
      {/* Clear Teams Confirmation */}
      {showClearTeamsConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Clear Teams?</h3>
            <p className="text-gray-600 mb-6">
              This will remove all players from their team slots, but keep them in the player pool.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearTeamsConfirm(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleClearTeams}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Clear Teams
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Match Confirmation */}
      {showClearMatchConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Clear Active Match?</h3>
            <p className="text-gray-600 mb-6">
              This will completely remove the active match and all team assignments. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearMatchConfirm(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleClearMatch}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Clear Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Implementation Strategy

The refactoring will be implemented in a careful, incremental approach to ensure all functionality is preserved:

1. **Database Setup**:
   - Implement the SQL to create the new match_player_pool table
   - Verify all foreign key constraints and indexes
   - Ensure existing data remains intact

2. **Component Extraction**:
   - Start by extracting all type definitions to a separate file
   - Create stub implementations of the API service functions
   - Implement state management hooks with basic functionality
   - Build UI components one by one with thorough testing

3. **Phased Rollout**:
   - Phase 1: Implement player pool management
   - Phase 2: Implement team assignment and display
   - Phase 3: Implement match management features
   - Phase 4: Implement special features (ringer creation, stats display)
   - Phase 5: Add comprehensive error handling and edge cases

4. **Integration Testing**:
   - Test each phase before proceeding to the next
   - Validate all functionality against the original component
   - Document any discrepancies for immediate correction

5. **Final Verification**:
   - Complete end-to-end testing of all workflows
   - Verify all edge cases are handled properly
   - Ensure all error scenarios have appropriate fallbacks
   - Validate performance improvements meet targets

Testing Strategy

A comprehensive testing approach will be used to ensure all functionality is preserved:

1. **Unit Tests**:
   - Test each API service function in isolation with mocked responses
   - Validate state hooks correctly manage data and handle errors
   - Ensure all UI components render properly in different states

2. **Integration Tests**:
   - Test player pool selection and validation
   - Verify team balancing with both algorithms works correctly
   - Validate drag and drop functionality between slots
   - Test match creation, editing, and removal
   - Verify ringer creation and management
   - Test clipboard functionality with fallbacks

3. **Edge Case Testing**:
   - Verify behavior with empty slots during drag and drop
   - Test network failures and API error handling
   - Validate performance with large player lists
   - Test with different team sizes and formations
   - Verify balance algorithm fallbacks

4. **User Acceptance Testing**:
   - Test with actual users to verify usability
   - Compare workflows with original component
   - Gather feedback on any issues or discrepancies

5. **Specific Feature Tests**:
   - Match Creation:
     - Create matches with different dates and team sizes
     - Validate date validation and formatting
     - Test team size constraints
   
   - Player Management:
     - Add and remove players from the pool
     - Test search functionality and filtering
     - Verify player count validation
   
   - Team Balancing:
     - Test ability-based algorithm
     - Test random algorithm
     - Verify fallback mechanisms when API fails
     - Validate balance statistics and visualization
   
   - Drag and Drop:
     - Test moving players between slots
     - Verify empty slot handling
     - Test invalid drag operations
     - Test on different devices and browsers
   
   - Ringer Creation:
     - Create ringers with different attributes
     - Verify ringers appear in player pool
     - Test attribute validation

6. **Performance Testing**:
   - Measure render times compared to original component
   - Test with large player lists (50+ players)
   - Verify search functionality remains responsive
   - Validate memory usage and component re-renders

Rollback Plan

A robust rollback plan is essential to ensure a safe refactoring:

1. **Version Control**:
   - Each phase will be implemented in a separate branch
   - Pull requests will require thorough code review and testing
   - Main branch will remain stable with original component

2. **Feature Flag Implementation**:
   - Implement a feature flag system to toggle between old and new components
   - Keep the original component as LegacyTeamAlgorithm.component.tsx
   - Create a wrapper component (TeamAlgorithmWrapper) to conditionally render either implementation

3. **Gradual Replacement**:
   - Initially set flag to use legacy implementation by default
   - Enable new implementation for specific test users
   - Only remove legacy implementation after thorough testing in production

4. **Monitoring Plan**:
   - Add comprehensive logging and error tracking
   - Monitor performance metrics for both implementations
   - Create dashboard for comparing error rates and user engagement

5. **Backup and Recovery**:
   - Regular backups of database during transition
   - Documented procedure for reverting to legacy implementation
   - Maintain compatibility with existing data structures

This rollback plan ensures that if any issues are discovered during the refactoring, we can immediately revert to the original implementation with minimal disruption.

Performance Optimizations

The refactored implementation will include several performance optimizations:

1. **Render Optimization**:
   - Use React.memo for components that don't need frequent re-renders
   - Implement useMemo and useCallback with proper dependency arrays
   - Minimize state updates during drag operations

2. **Data Management**:
   - Implement efficient data structures for player lookup
   - Use SWR or React Query for data fetching and caching
   - Batch state updates where possible

3. **UI Virtualization**:
   - Implement virtualized lists for large player selections
   - Lazy load components that aren't immediately visible
   - Use code splitting to reduce initial bundle size

4. **Network Optimization**:
   - Debounce search input to prevent excessive API calls
   - Implement caching for player data
   - Use optimistic UI updates for better user experience

5. **Error Resilience**:
   - Implement retry mechanisms for transient failures
   - Add fallback rendering for component errors
   - Preserve user input during unexpected events

These optimizations will result in a significantly more performant component that maintains all the functionality of the original while providing a better user experience.