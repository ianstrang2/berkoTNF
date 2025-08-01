Final Specification for Enabling Uneven Teams in StatKick App (v1.6 - Strict 4v4 Minimum)
Version: 1.6

Date: January 31, 2025

Author: User Feedback + Cursor Implementation

**CHANGELOG v1.6 - STRICT 4v4 MINIMUM:**
- **Strict 8-player minimum**: Block any pool <8 players (no 3v4, 3v3, etc.)
- **4v4 simplification**: Exactly 8 players treated as simplified case (all midfielders, Performance/Random only)
- **Ability balancing restriction**: Disabled for ANY uneven team (4v4, 4v5, 5v6, etc.) to preserve existing algorithm
- **Enhanced blocking**: No proceed option for <8 players, only "Add Players" or "Cancel"
- **Team minimum enforcement**: Both teams must have >=4 players in any split
- **Clear 4v4 vs 5v5+ distinction**: 8 players = simplified, 9+ players = full positional treatment
- **Updated modal messaging**: Clear guidance for blocked vs allowed scenarios with balancing restrictions

Purpose: Enable **flexible team management** with a strict minimum of 4v4 (8 players) to ensure viable matches. The system treats exactly 8 players as a simplified case (all midfielders) while 9+ players get full positional treatment with optional uneven splits. **Ability balancing is disabled for ALL uneven teams** to preserve the existing algorithm, with Performance and Random balancing available for uneven scenarios.

## Key Design Principles

**Strict Viability**: Minimum 8 players ensures both teams have at least 4 players for competitive matches.

**Clear Simplification Boundary**: 8 players (4v4) = simplified treatment, 9+ players = full positional treatment.

**Ability Balancing Restriction**: Disabled for ANY uneven team (including 4v4 simplified matches and uneven splits like 4v5, 5v6) to preserve the existing Ability algorithm. Only Performance and Random balancing are supported for uneven teams.

**Planning Guide Approach**: team_size remains fixed as a planning tool (SMS caps, over-cap prevention, base template) but doesn't restrict actual splits.

**Adaptive Intelligence**: Modal messages and options adapt to pool size, suggesting optimal configurations while blocking non-viable scenarios.

**Enhanced Blocking**: No proceed option for insufficient pools - clear guidance to add players.

**Graceful Scaling**: Templates auto-scale from team_size base to actual splits for 9+ player pools using intelligent rounding.

**Mobile-First Modal UX**: Full-screen modals on mobile with large touch targets and clear action hierarchy.

## Implementation Changes

**Phase 1: Always-Enabled Lock Pool Button**

`src/app/admin/matches/[id]/page.tsx`:
```typescript
// FIND:
disabled = playerPoolIds.length !== matchData.teamSize * 2;

// REPLACE WITH:
disabled = false; // Always enabled in Draft state
```

**Phase 2: Enhanced Dynamic Button Hints**

Add intelligent hint calculation with 8-player minimum:
```typescript
const { currentStep, primaryLabel, primaryAction, primaryDisabled, buttonHint } = useMemo(() => {
  // ... existing logic ...
  
  if (matchData.state === 'Draft') {
    const poolSize = playerPoolIds.length;
    const targetSize = matchData.teamSize * 2;
    const sizeA = Math.floor(poolSize / 2);
    const sizeB = Math.ceil(poolSize / 2);
    const diff = Math.abs(sizeA - sizeB);
    
    let hint = '';
    if (poolSize === 0) {
      hint = 'Add players to begin';
    } else if (poolSize < 8) {
      const needed = 8 - poolSize;
      hint = `Need ${needed} more for 4v4 minimum`;
    } else if (poolSize === 8) {
      hint = 'Lock 4v4 (all midfielders, Performance/Random only)';
    } else if (poolSize < targetSize - 2) {
      const needed = targetSize - poolSize;
      hint = `Need ${needed} more for ${matchData.teamSize}v${matchData.teamSize} or lock ${sizeA}v${sizeB}`;
    } else if (poolSize === targetSize) {
      hint = `Perfect for ${matchData.teamSize}v${matchData.teamSize}`;
    } else if (diff <= 1 && sizeA >= 4 && sizeB >= 4) {
      hint = `Lock ${sizeA}v${sizeB} (Performance/Random only)`;
    } else {
      hint = `Add/remove for better balance (current: ${sizeA}v${sizeB})`;
    }
    
    return { 
      // ... existing values ...
      buttonHint: hint 
    };
  }
  
  return { /* ... existing logic ... */, buttonHint: '' };
}, [matchData, playerPoolIds, actions]);
```

**Phase 3: Enhanced Adaptive Lock Modal System**

Add comprehensive modal state and logic with balancing restrictions:
```typescript
// Add modal states
const [isLockModalOpen, setIsLockModalOpen] = useState(false);
const [modalConfig, setModalConfig] = useState<{
  poolSize: number;
  sizeA: number;
  sizeB: number;
  isBlocked: boolean;
  blockReason: string;
  isSimplified: boolean;
  isUneven: boolean;
  suggestedTeamSize?: number;
  message: string;
}>({
  poolSize: 0,
  sizeA: 0,
  sizeB: 0,
  isBlocked: false,
  blockReason: '',
  isSimplified: false,
  isUneven: false,
  message: ''
});

// Modify primary action to always show modal with enhanced blocking
action = () => {
  const poolSize = playerPoolIds.length;
  const sizeA = Math.floor(poolSize / 2);
  const sizeB = Math.ceil(poolSize / 2);
  const diff = Math.abs(sizeA - sizeB);
  
  // Determine blocking conditions
  let isBlocked = false;
  let blockReason = '';
  
  if (poolSize < 8) {
    isBlocked = true;
    blockReason = 'minimum';
  } else if (sizeA < 4 || sizeB < 4) {
    isBlocked = true;
    blockReason = 'team_too_small';
  } else if (diff > 1) {
    isBlocked = true;
    blockReason = 'too_uneven';
  }
  
  const isSimplified = poolSize === 8; // Exactly 4v4
  const isUneven = sizeA !== sizeB; // Any uneven split
  
  // Find nearest valid team_size for suggestions
  const validSizes = [5, 6, 7, 8, 9, 10, 11]; // Based on team_size_templates
  const nearestEven = validSizes.find(size => size * 2 >= poolSize) || validSizes[validSizes.length - 1];
  
  let message = '';
  if (isBlocked) {
    switch (blockReason) {
      case 'minimum':
        message = `${poolSize} players - too few for 4v4 minimum (need 8+). Add players?`;
        break;
      case 'team_too_small':
        message = `${poolSize} players would create ${sizeA}v${sizeB} with teams <4 players. Add players for viable match?`;
        break;
      case 'too_uneven':
        message = `${poolSize} players would create ${sizeA}v${sizeB} (difference >1). Please add/remove players.`;
        break;
    }
  } else if (isSimplified) {
    message = `${poolSize} players - locking to 4v4 as all midfielders (Performance/Random only). Proceed?`;
  } else if (isUneven) {
    message = `${poolSize} players - locking to ${sizeA}v${sizeB} (scaled from ${matchData.teamSize}v${matchData.teamSize} template). Performance/Random balancing only. Proceed?`;
  } else {
    message = `${poolSize} players - locking to ${sizeA}v${sizeB} (scaled from ${matchData.teamSize}v${matchData.teamSize} template). All balancing options available. Proceed?`;
  }
  
  setModalConfig({
    poolSize,
    sizeA,
    sizeB,
    isBlocked,
    blockReason,
    isSimplified,
    isUneven,
    suggestedTeamSize: nearestEven,
    message
  });
  setIsLockModalOpen(true);
};

// Add enhanced adaptive modal component
<EnhancedAdaptiveLockModal 
  isOpen={isLockModalOpen}
  onClose={() => setIsLockModalOpen(false)}
  config={modalConfig}
  currentTeamSize={matchData.teamSize}
  onConfirm={() => {
    actions.lockPool({ playerIds: playerPoolIds.map(id => Number(id)) });
    setIsLockModalOpen(false);
  }}
  onSetTeamSize={(newSize) => {
    // Update team_size and re-calculate
    handleEditMatch({ team_size: newSize });
    setIsLockModalOpen(false);
  }}
  onCancel={() => setIsLockModalOpen(false)}
/>
```

**Phase 4: Enhanced Adaptive Lock Modal Component**

Create enhanced modal component with strict blocking:
```typescript
// src/components/admin/matches/EnhancedAdaptiveLockModal.component.tsx
interface EnhancedAdaptiveLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    poolSize: number;
    sizeA: number;
    sizeB: number;
    isBlocked: boolean;
    blockReason: string;
    isSimplified: boolean;
    isUneven: boolean;
    suggestedTeamSize?: number;
    message: string;
  };
  currentTeamSize: number;
  onConfirm: () => void;
  onSetTeamSize: (newSize: number) => void;
  onCancel: () => void;
}

const EnhancedAdaptiveLockModal = ({ isOpen, onClose, config, currentTeamSize, onConfirm, onSetTeamSize, onCancel }: EnhancedAdaptiveLockModalProps) => {
  const { poolSize, sizeA, sizeB, isBlocked, blockReason, isSimplified, isUneven, suggestedTeamSize, message } = config;
  
  // Determine modal appearance based on state
  let title = "Lock Pool";
  let icon: "info" | "warning" | "question" = "question";
  let confirmText: string | undefined = "Lock Teams";
  let cancelText = "Cancel";
  
  if (isBlocked) {
    switch (blockReason) {
      case 'minimum':
        title = "Too Few Players";
        icon = "warning";
        confirmText = undefined; // No proceed option
        cancelText = "Add Players";
        break;
      case 'team_too_small':
        title = "Teams Too Small";
        icon = "warning";
        confirmText = undefined;
        cancelText = "Add Players";
        break;
      case 'too_uneven':
        title = "Teams Too Uneven";
        icon = "warning";
        confirmText = undefined;
        cancelText = "Add/Remove Players";
        break;
    }
  } else if (isSimplified) {
    title = "4v4 Match";
    icon = "info";
    confirmText = "Proceed with 4v4";
    cancelText = "Add Players";
  } else if (isUneven) {
    title = "Uneven Teams";
    icon = "info";
    confirmText = "Lock Uneven Teams";
    cancelText = "Add/Remove Players";
  }
  
  return (
    <SoftUIConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      icon={icon}
      onConfirm={isBlocked ? undefined : onConfirm}
      onCancel={onCancel}
      additionalActions={!isBlocked && !isSimplified && !isUneven && suggestedTeamSize && suggestedTeamSize !== currentTeamSize ? [
        {
          label: `Set to ${suggestedTeamSize}v${suggestedTeamSize}`,
          onClick: () => onSetTeamSize(suggestedTeamSize),
          variant: "secondary"
        }
      ] : undefined}
    />
  );
};
```

**Phase 5: Enhanced API Lock Pool Updates**

`src/app/api/admin/upcoming-matches/[id]/lock-pool/route.ts`:
```typescript
// FIND:
const requiredPlayerCount = match.team_size * 2;
if (playerIds.length !== requiredPlayerCount) {
  return NextResponse.json({ 
    success: false, 
    error: `Player count mismatch. Expected ${requiredPlayerCount}, got ${playerIds.length}.`
  }, { status: 409 });
}

// REPLACE WITH:
const poolSize = playerIds.length;
const sizeA = Math.floor(poolSize / 2);
const sizeB = Math.ceil(poolSize / 2);
const diff = Math.abs(sizeA - sizeB);

// Strict minimum enforcement - must have at least 8 players for 4v4
if (poolSize < 8) {
  return NextResponse.json({ 
    success: false, 
    error: `Too few for 4v4 minimum (need 8+ players). Got ${poolSize}.`
  }, { status: 400 });
}

// Both teams must have at least 4 players
if (sizeA < 4 || sizeB < 4) {
  return NextResponse.json({ 
    success: false, 
    error: `Teams too small (${sizeA}v${sizeB}). Both teams need 4+ players.`
  }, { status: 400 });
}

// Maximum difference is 1 player
if (diff > 1) {
  return NextResponse.json({ 
    success: false, 
    error: `Team difference too large (${sizeA}v${sizeB}). Max difference is 1 player.`
  }, { status: 400 });
}

const isSimplified = poolSize === 8; // Exactly 4v4
const isUneven = sizeA !== sizeB; // Any uneven split

// Return enhanced split info for downstream processing
return NextResponse.json({ 
  success: true, 
  data: updatedMatch,
  splitInfo: { sizeA, sizeB, isUneven, isSimplified }
});
```

**Phase 6: Balance Teams API Validation**

`src/app/api/admin/balance-teams/route.ts`:
```typescript
// ADD: Enhanced validation for Ability balancing
export async function POST(request: Request) {
  try {
    const { matchId, playerIds, method } = await request.json();
    
    // Get match info to determine team composition
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: parseInt(matchId) },
      include: { players: true }
    });
    
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    const poolSize = playerIds.length;
    const sizeA = Math.floor(poolSize / 2);
    const sizeB = Math.ceil(poolSize / 2);
    const isUneven = sizeA !== sizeB;
    const isSimplified = poolSize === 8;
    
    // Block Ability balancing for ANY uneven team (4v4 or larger splits like 4v5, 5v6)
    if (method === 'ability' && (isUneven || isSimplified)) {
      return NextResponse.json({
        success: false,
        error: 'Ability balancing not supported for uneven teams. Use Performance or Random.',
      }, { status: 400 });
    }
    
    // Route to appropriate balancing algorithm
    if (method === 'ability') {
      // Only allowed for even teams (9v9, 10v10, etc.)
      return await balanceByRating(matchId);
    } else if (method === 'performance') {
      return await balanceByPerformance(matchId, playerIds);
    } else if (method === 'random') {
      return await randomBalance(matchId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid balance method' }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Error in balance teams:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Phase 7: Enhanced BalanceTeamsPane Updates**

`src/components/admin/matches/BalanceTeamsPane.component.tsx`:
```typescript
// Add enhanced team state detection
const totalPlayers = teamA.length + teamB.length;
const isSimplified = totalPlayers === 8; // Exactly 4v4
const isUneven = teamA.length !== teamB.length; // Any uneven split, e.g., 4v5

// Update balance options modal to disable Ability for ANY uneven team
const handleBalanceConfirm = async (method: 'ability' | 'performance' | 'random') => {
  if ((isSimplified || isUneven) && method === 'ability') {
    onShowToast(
      `Ability balancing not available for ${isSimplified ? '4v4' : `${teamA.length}v${teamB.length}`} teams - use Performance or Random`,
      'error'
    );
    return;
  }
  
  setIsBalanceModalOpen(false);
  setIsBalancing(true);
  setBalanceMethod(method);
  setIsTeamsModified(false);
  try {
    await balanceTeamsAction(method);
  } catch(e: any) { 
    onShowToast(e.message || "Balancing failed", "error"); 
  } finally { 
    setIsBalancing(false); 
  }
};

// Hide TornadoChart for 4v4 matches
const shouldShowTornadoChart = !isSimplified && teamStatsData && balanceWeights;

// Update team column rendering for 4v4 matches
const renderTeamColumn = (teamName: 'A' | 'B') => {
  if (isSimplified) {
    // Flat list for 4v4 matches - all midfielders
    return (
      <div className="space-y-1">
        <h3 className="font-bold text-slate-700 text-lg text-center mb-3">
          {teamName === 'A' ? 'Orange' : 'Green'} (All Midfielders)
        </h3>
        {slots.map((slotIndex) => renderTeamSlot(teamName, slotIndex))}
      </div>
    );
  }
  
  // ... existing positioned rendering for 9+ player matches
};

// Add comprehensive status note
{(isSimplified || isUneven) && (
  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm text-blue-800">
      <strong>{isSimplified ? '4v4 Match' : 'Uneven Teams'}:</strong> 
      {isSimplified 
        ? ' All positions treated as midfielders. Performance/Random balancing only.'
        : ' Ability balancing disabled for uneven teams. Performance/Random balancing available.'
      }
    </p>
  </div>
)}
```

**Phase 8: Balance Options Modal Enhancement**

`src/components/admin/matches/BalanceOptionsModal.component.tsx`:
```typescript
// Enhanced balance options with Ability restriction
interface BalanceOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: 'ability' | 'performance' | 'random') => void;
  isLoading: boolean;
  isUneven?: boolean;
  isSimplified?: boolean;
}

const BalanceOptionsModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading, 
  isUneven = false, 
  isSimplified = false 
}: BalanceOptionsModalProps) => {
  const balanceOptions = [
    { 
      value: 'ability', 
      label: 'Ability: Use player ratings to create balanced teams',
      description: 'Advanced algorithm using positional ratings',
      disabled: isSimplified || isUneven,
      disabledReason: isSimplified 
        ? 'Not available for 4v4 matches' 
        : 'Not available for uneven teams'
    },
    { 
      value: 'performance', 
      label: 'Performance: Balance based on recent match performance',
      description: 'Uses historical performance data',
      disabled: false
    },
    { 
      value: 'random', 
      label: 'Random: Randomly distribute players',
      description: 'Good for casual play and uneven numbers',
      disabled: false
    },
  ];

  return (
    <SoftUIConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Balancing Method"
      message={`Select how to balance teams${isUneven ? ' (uneven teams detected)' : ''}:`}
      customContent={
        <div className="space-y-3">
          {balanceOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => !option.disabled && onConfirm(option.value as any)}
              disabled={option.disabled || isLoading}
              className={`w-full p-4 text-left rounded-lg border transition-all ${
                option.disabled
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-600 mt-1">
                {option.disabled ? option.disabledReason : option.description}
              </div>
            </button>
          ))}
        </div>
      }
      confirmText={undefined}
      cancelText="Cancel"
      onCancel={onClose}
    />
  );
};
```

**Phase 9: Enhanced CompleteMatchForm Updates**

`src/components/admin/matches/CompleteMatchForm.component.tsx`:
```typescript
// Add note for 4v4 matches in match report
const isSimplified = players.length === 8;

// Update match completion to include 4v4 note
const handleSubmit = async (formData: any) => {
  const matchData = {
    ...formData,
    match_note: isSimplified ? "Small match (4v4): All positions midfield" : undefined
  };
  
  // ... existing submission logic
};

// Display note in UI
{isSimplified && (
  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <p className="text-sm text-amber-800">
      <strong>Note:</strong> This 4v4 match will be recorded with all players as midfielders.
    </p>
  </div>
)}
```

## Benefits of This Enhanced Approach

✅ **Strict Viability**: 8-player minimum ensures competitive 4v4 matches
✅ **Algorithm Protection**: Ability balancing completely untouched for uneven teams
✅ **Clear Boundaries**: 4v4 (simplified) vs 5v5+ (full positions) vs uneven (restricted balancing)
✅ **Enhanced Blocking**: No proceed option for non-viable scenarios
✅ **Consistent UX**: Clear messaging about balancing restrictions across all interfaces
✅ **Template Flexibility**: Auto-scales templates for 9+ players, simplified for 8
✅ **Mobile Optimized**: Full-screen modals with large touch targets
✅ **Backward Compatible**: Even teams work exactly as before with all balancing options

## Scenario Examples

**Minimum Viable (8 players)**:
- Hint: "Lock 4v4 (all midfielders, Performance/Random only)"
- Modal: "8 players - locking to 4v4 as all midfielders (Performance/Random only). Proceed?"
- Result: 4v4 flat teams, Performance/Random only, all recorded as midfielders

**Perfect Small Match (10 players, 5v5)**:
- Hint: "Perfect for 5v5"
- Modal: "10 players - locking to 5v5. All balancing options available. Proceed?"
- Result: Normal 5v5 with 2/2/1 positions, all balancing options

**Uneven Match (9 players, 4v5)**:
- Hint: "Lock 4v5 (Performance/Random only)"
- Modal: "9 players - locking to 4v5 (scaled from 9v9 template). Performance/Random balancing only. Proceed?"
- Result: 4v5 with scaled positions, Performance/Random only (Ability disabled)

**Perfect Large Match (18 players, 9v9)**:
- Hint: "Perfect for 9v9"
- Modal: "18 players - locking to 9v9. All balancing options available. Proceed?"
- Result: Normal 9v9 with full positions, all balancing options including Ability

**Insufficient Pool (6 players)**:
- Hint: "Need 2 more for 4v4 minimum"
- Modal: "6 players - too few for 4v4 minimum (need 8+). Add players?"
- Blocked: Only "Add Players" or "Cancel" options

## Balancing Algorithm Matrix

| Team Configuration | Ability | Performance | Random |
|-------------------|---------|-------------|---------|
| 4v4 (8 players) | ❌ Disabled | ✅ Available | ✅ Available |
| Uneven (4v5, 5v6, etc.) | ❌ Disabled | ✅ Available | ✅ Available |
| Even 5v5+ (10, 12, 14+ players) | ✅ Available | ✅ Available | ✅ Available |

## Testing Strategy

**Phase 1 Tests:**
- **Strict minimum**: 8+ players required, <8 blocked with clear messaging
- **4v4 simplification**: Exactly 8 players → all midfielders, Performance/Random only
- **Ability restriction**: Any uneven team blocks Ability balancing with clear error
- **Modal blocking**: No proceed option for non-viable scenarios

**Phase 2 Tests:**
- **Uneven team flow**: 9, 11, 13 players → Performance/Random only
- **Even team flow**: 10, 12, 14+ players → all balancing options
- **API validation**: Backend rejects Ability requests for uneven teams
- **UI consistency**: Balance options modal shows disabled Ability for uneven

**Phase 3 Tests:**
- **Boundary conditions**: 8 (simplified), 9 (first uneven), 10 (even), 11 (uneven)
- **Error messaging**: Toast notifications for Ability attempts on uneven teams
- **Data integrity**: Match reports correctly note restrictions and configurations

This approach maintains the 4-6 hour implementation estimate while ensuring the Ability algorithm remains completely untouched and all uneven team scenarios are handled consistently with clear user guidance.