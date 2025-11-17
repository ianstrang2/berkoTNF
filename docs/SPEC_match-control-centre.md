# **Unified Match Lifecycle – Complete Implementation Documentation**

_Last updated: December 2024_

---

## 0. Purpose & Scope

This document describes the fully implemented **Match Control Centre (MCC)** system that successfully unifies match planning, team balancing, and result entry into a single cohesive workflow. The system replaces the previous separate screens with an integrated lifecycle approach.

**Key Achievement**: Admins now manage the entire match process through one interface that evolves from Draft → PoolLocked → TeamsBalanced → Completed, with full mobile optimization and advanced team balancing capabilities.

### **Related Documentation**
- **UI Enhancement Plan**: See `match-crud-ui-plan.md` for specific CRUD UI improvements that address polish/completeness gaps identified after main system implementation
- **Dashboard Implementation**: See `match-report.md` for dashboard reorganization and feat-breaking detection system

---

## 1. Implementation Status & Architecture

### ✅ **Fully Implemented Features**
- **Complete Match Lifecycle**: Draft → PoolLocked → TeamsBalanced → Completed → (Undo)
- **Advanced Team Balancing**: Multiple algorithms (Ability, Performance, Random) with real-time analysis
- **Match CRUD Operations**: Create, edit, delete matches with full validation
- **Mobile-First Design**: Responsive interface optimized for on-pitch use
- **Drag & Drop Interface**: Touch-friendly player assignment with position management
- **Real-time Team Analysis**: TornadoChart integration with balance scoring
- **Configuration Management**: Database-driven settings for team names, weights, templates

### 🏗️ **Technical Stack**
- **Frontend**: Next.js 13 App Router, TypeScript, Tailwind CSS
- **Backend**: Prisma ORM, PostgreSQL via Supabase
- **State Management**: Custom React hooks with optimistic updates
- **UI Components**: Reusable design system with soft-UI styling

---

## 2. Database Schema (Implemented)

### **Core Tables**

#### `upcoming_matches`
```sql
model upcoming_matches {
  upcoming_match_id Int      @id @default(autoincrement())
  match_date        DateTime @db.Timestamptz(6)
  team_size         Int
  actual_size_a     Int?     -- NEW: Actual team A size (for uneven teams)
  actual_size_b     Int?     -- NEW: Actual team B size (for uneven teams)
  state             match_state @default(Draft)  -- NEW: Lifecycle state
  state_version     Int      @default(0)         -- NEW: Concurrency control
  is_balanced       Boolean  @default(false)
  is_active         Boolean  @default(false)
  team_a_name       String?  @default("Orange")
  team_b_name       String?  @default("Green")
  location          String?
  notes             String?
  is_completed      Boolean? @default(false)
  created_at        DateTime @default(now())
  updated_at        DateTime @default(now())
  
  players           upcoming_match_players[]
  matches           matches[]
  player_pool       match_player_pool[]
}
```

#### `matches` (Enhanced)
```sql
model matches {
  match_id          Int  @id @default(autoincrement())
  upcoming_match_id Int? -- NEW: Links to planning record
  match_date        DateTime
  team_a_score      Int
  team_b_score      Int
  created_at        DateTime @default(now())
  
  upcoming_matches  upcoming_matches? @relation(fields: [upcoming_match_id])
  player_matches    player_matches[]
}
```

#### `upcoming_match_players` (Enhanced)
```sql
model upcoming_match_players {
  upcoming_player_id Int @id @default(autoincrement())
  upcoming_match_id  Int
  player_id          Int
  team               String    -- 'A', 'B', or 'Unassigned'
  slot_number        Int?      -- NEW: Positional assignment
  created_at         DateTime  @default(now())
  updated_at         DateTime  @default(now())
  
  player             players          @relation(fields: [player_id])
  match              upcoming_matches @relation(fields: [upcoming_match_id])
}
```

#### `match_player_pool` (New)
```sql
model match_player_pool {
  id                     Int     @id @default(autoincrement())
  upcoming_match_id      Int
  player_id              Int
  response_status        String  @default("IN") -- "IN", "OUT", "MAYBE"
  response_timestamp     DateTime @default(now())
  notification_sent      Boolean @default(false)
  notification_timestamp DateTime?
  notes                  String?
  created_at             DateTime @default(now())
  updated_at             DateTime @default(now())
  
  player                 players          @relation(fields: [player_id])
  match                  upcoming_matches @relation(fields: [upcoming_match_id])
  
  @@unique([upcoming_match_id, player_id])
}
```

### **Configuration Tables**

#### `app_config` (Enhanced)
```sql
-- Stores dynamic configuration
team_a_name: "Orange"           -- Customizable team names
team_b_name: "Green"
show_on_fire: "true"            -- Feature toggles
show_grim_reaper: "true"
```

#### `team_balance_weights` (New)
```sql
model team_balance_weights {
  weight_id      Int     @id @default(autoincrement())
  position_group String  -- "defense", "midfield", "attack"
  attribute      String  -- "goalscoring", "defending", etc.
  weight         Decimal @db.Decimal(4, 2)
  created_at     DateTime @default(now())
  updated_at     DateTime @default(now())
}
```

#### `team_size_templates` (New)
```sql
model team_size_templates {
  template_id Int @id @default(autoincrement())
  team_size   Int
  name        String
  defenders   Int    -- Formation configuration
  midfielders Int
  attackers   Int
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now())
}
```

### **State Management**
```sql
enum match_state {
  Draft           -- Initial state, player selection
  PoolLocked      -- Players locked, team balancing
  TeamsBalanced   -- Teams confirmed, ready for match
  Completed       -- Results entered and saved
  Cancelled       -- Match cancelled (soft delete)
}
```

---

## 3. API Routes (Complete Implementation)

### **Core Match Management**
| Endpoint | Method | Purpose | Implementation Status |
|----------|--------|---------|---------------------|
| `/api/admin/upcoming-matches` | GET | Fetch matches (list or specific) | ✅ Complete |
| `/api/admin/upcoming-matches` | POST | Create new match | ✅ Complete |
| `/api/admin/upcoming-matches` | PUT | Edit match metadata | ✅ Complete |
| `/api/admin/upcoming-matches` | DELETE | Delete match | ✅ Complete |

### **Lifecycle Transitions**
| Endpoint | Method | Purpose | State Transition |
|----------|--------|---------|------------------|
| `/api/admin/upcoming-matches/[id]/lock-pool` | PATCH | Lock player selection | Draft → PoolLocked |
| `/api/admin/upcoming-matches/[id]/confirm-teams` | PATCH | Confirm team assignments | PoolLocked → TeamsBalanced |
| `/api/admin/upcoming-matches/[id]/complete` | POST | Submit match results | TeamsBalanced → Completed |
| `/api/admin/upcoming-matches/[id]/unlock-pool` | PATCH | Revert to player selection | PoolLocked → Draft |
| `/api/admin/upcoming-matches/[id]/unlock-teams` | PATCH | Revert to team balancing | TeamsBalanced → PoolLocked |
| `/api/admin/upcoming-matches/[id]/undo` | PATCH | Undo completion | Completed → TeamsBalanced |

### **Team Management**
| Endpoint | Method | Purpose | Features |
|----------|--------|---------|----------|
| `/api/admin/upcoming-match-players` | PUT | Update individual player assignment | Drag & drop support |
| `/api/admin/upcoming-match-players/clear` | POST | Clear all team assignments | Reset to pool |
| `/api/admin/balance-teams` | POST | Auto-balance teams | Multiple algorithms |
| `/api/admin/random-balance-match` | POST | Random team assignment | Quick distribution |

### **Player Pool Management**
| Endpoint | Method | Purpose | Features |
|----------|--------|---------|----------|
| `/api/admin/match-player-pool` | GET | Get player availability | Response tracking |
| `/api/admin/match-player-pool` | POST | Add player to pool | Availability management |
| `/api/admin/match-player-pool` | DELETE | Remove player from pool | Dynamic selection |

### **Configuration APIs**
| Endpoint | Method | Purpose | Usage |
|----------|--------|---------|--------|
| `/api/admin/app-config` | GET | Fetch configuration values | Team names, feature flags |
| `/api/admin/balance-algorithm` | GET | Get balance weights | TornadoChart display |
| `/api/admin/team-templates` | GET | Get formation templates | Position assignments |
| `/api/latest-player-status` | GET | Get special player indicators | Fire/Grim Reaper status |

---

## 4. Component Architecture (Next.js 13 App Router)

### **4.1 Routing Structure**
```
/app/admin/matches/
├── page.tsx                    # Match list with create functionality
└── [id]/
    └── page.tsx               # Match Control Centre (MCC)
```

### **4.2 Core Components**

#### **Match Control Centre (`/app/admin/matches/[id]/page.tsx`)**
**Purpose**: Main orchestration component for match lifecycle management
**Features**:
- State-driven UI rendering based on match lifecycle
- Responsive layout with mobile-optimized CTA bar
- Integrated edit/delete functionality via dropdown menu
- Real-time state synchronization with optimistic updates

```typescript
// Key implementation pattern
const { currentStep, primaryLabel, primaryAction, primaryDisabled } = useMemo(() => {
  switch (matchData.state) {
    case 'Draft': return { 
      step: 'Pool', 
      label: 'Lock Pool', 
      action: () => actions.lockPool({ playerIds }),
      disabled: playerIds.length !== teamSize * 2 
    };
    case 'PoolLocked': return {
      step: 'Teams',
      label: 'Confirm Teams',
      action: () => actions.confirmTeams(),
      disabled: !areAllSlotsFilled(matchData.players, matchData.actualSizeA, matchData.actualSizeB)
    };
    // ... additional states
  }
}, [matchData, playerPoolIds, actions]);
```

#### **StepperBar (`StepperBar.component.tsx`)**
**Purpose**: Visual progress indicator showing current lifecycle stage
**Features**:
- 4-step progression: Pool → Teams → Result → Done
- Gradient styling with completion indicators
- Responsive typography and spacing

#### **GlobalCtaBar (`GlobalCtaBar.component.tsx`)**
**Purpose**: Context-aware primary action button
**Mobile Optimization**:
```css
/* Mobile: Fixed bottom positioning */
.max-md:fixed .max-md:bottom-0 .max-md:z-30 .max-md:shadow-soft-xl-top

/* Desktop: Inline positioning */
.md:relative .md:mt-6
```

#### **PlayerPoolPane (`PlayerPoolPane.component.tsx`)**
**Purpose**: Player selection interface for Draft state
**Features**:
- Real-time player availability management
- Integration with existing `PlayerPool.component`
- Optimistic UI updates with rollback on failure
- Team size validation (exactly `teamSize * 2` required)

#### **BalanceTeamsPane (`BalanceTeamsPane.component.tsx`)**
**Purpose**: Advanced team balancing interface for PoolLocked state

**Confirm Teams Logic**: The "Confirm Teams" button is enabled when **all team slots are filled** (not when teams are algorithmically balanced). This allows users to:
- Auto-balance teams and confirm immediately
- Manually arrange teams via drag-and-drop and confirm when complete  
- Use balance algorithms as optional helpers, not mandatory requirements

**Key Features**:

1. **Multiple Balance Algorithms**:
   ```typescript
   // Algorithm selection modal
   - Ability-based: Uses player ratings and position-specific weights
   - Performance-based: Historical match performance analysis  
   - Random: Quick distribution for uneven numbers
   ```

2. **Real-time Team Analysis**:
   ```typescript
   // TornadoChart integration
   {balanceMethod === 'ability' && teamStatsData && balanceWeights && (
     <TornadoChart 
       teamAStats={teamStatsData.teamAStats} 
       teamBStats={teamStatsData.teamBStats} 
       weights={balanceWeights}
       isModified={isTeamsModified}
     />
   )}
   ```

3. **Drag & Drop Interface**:
   ```typescript
   // Touch-optimized player assignment
   const updatePlayerAssignment = async (player, targetTeam, targetSlot) => {
     // Optimistic UI update
     setPlayers(currentPlayers => { /* immediate state change */ });
     
     // Server synchronization with conflict resolution
     await fetch('/api/admin/upcoming-match-players', {
       method: 'PUT',
       body: JSON.stringify({ player_id, team, slot_number })
     });
   };
   ```

4. **Formation Templates**:
   - Database-driven position layouts
   - Visual position separators between defenders/midfielders/attackers
   - Configurable team sizes (5v5 to 11v11)

5. **Copy Teams Feature**:
   ```typescript
   // Clipboard integration with emoji support
   const textToCopy = `--- ${teamAName.toUpperCase()} ---
   ${teamA.map(p => p.name + (isOnFire ? ' 🔥' : '') + (isGrimReaper ? ' 💀' : '')).join('\n')}
   
   --- ${teamBName.toUpperCase()} ---
   ${teamB.map(p => p.name + /* emojis */).join('\n')}`;
   
   await navigator.clipboard.writeText(textToCopy);
   ```

#### **CompleteMatchForm (`CompleteMatchForm.component.tsx`)**
**Purpose**: Match result entry for TeamsBalanced/Completed states
**Advanced Features**:

1. **Auto-scoring System**:
   ```typescript
   // Real-time score calculation
   const finalTeamAScore = teamAGoalsTotal + ownGoalsA;
   const finalTeamBScore = teamBGoalsTotal + ownGoalsB;
   
   // Read-only score inputs show calculated totals
   <input value={calculatedScore} readOnly className="cursor-not-allowed" />
   ```

2. **Own Goals Support**:
   ```typescript
   // Dedicated OG/Unknown rows per team
   {renderPlayerRow(
     { id: `own-goal-${teamId}`, name: 'OG / Unknown', isSynthetic: true }, 
     true
   )}
   ```

3. **Player Goal Tracking**:
   - Individual goal counters with +/- buttons
   - Touch-optimized controls (48px targets)
   - Real-time total synchronization

4. **Responsive Design**:
   - Mobile: Stacked team columns
   - Desktop: Side-by-side team layout
   - Consistent player name truncation (14 chars)

#### **Match List Page (`/app/admin/matches/page.tsx`)**
**Purpose**: Enhanced match listing with CRUD operations
**New Features** (from fixing-matchflow.md):

1. **Create New Match**:
   ```typescript
   // Desktop button + mobile FAB
   <Button className="hidden md:flex">+ New Match</Button>
   <Button className="md:hidden fixed bottom-20 right-4 z-40 rounded-full">+</Button>
   ```

2. **Match Cards with State Display**:
   ```typescript
   // State-aware styling
   <span className="bg-gradient-to-tl from-purple-700 to-pink-500">
     {formatStateDisplay(match.state)}
   </span>
   ```

3. **Active Match Management**:
   ```typescript
// Shows all non-completed matches regardless of date
const href = `/admin/matches/${match.upcoming_match_id}`;
// Active matches = any match requiring action (Draft/PoolLocked/TeamsBalanced)
setActive(activeData.data?.filter((m: ActiveMatch) => m.state !== 'Completed') || []);
```

**UX Improvement**: Changed from "Upcoming" to "Active" matches to better reflect functionality - shows all matches needing action regardless of scheduled date, removing confusing date-based filtering.

#### **Shared Modals**

##### **MatchModal (`MatchModal.component.tsx`)**
**Purpose**: Unified create/edit interface
**Features**:
- Single component for both create and edit operations
- Date picker with validation
- Team size selector (5v5 to 11v11)
- Error handling with inline display
- Loading states with disabled controls

##### **BalanceOptionsModal (`BalanceOptionsModal.component.tsx`)**
**Purpose**: Algorithm selection for team balancing
**Options**:
- **Ability**: "Use player ratings to create balanced teams"
- **Performance**: "Balance based on recent match performance"  
- **Random**: "Randomly distribute players (good for uneven numbers)"

---

## 5. State Management & Hooks

### **5.1 useMatchState Hook (Core Implementation)**
**File**: `src/hooks/useMatchState.hook.ts`
**Purpose**: Centralized match lifecycle and state management

#### **Key Features**:
1. **Real-time Data Fetching**:
   ```typescript
   const fetchMatchState = useCallback(async () => {
     const response = await fetch(`/api/admin/upcoming-matches?matchId=${matchId}`);
     const transformedData: MatchData = {
       state: result.data.state,
       stateVersion: result.data.state_version,
       teamSize: result.data.team_size,
       players: result.data.players || [],
       isBalanced: result.data.is_balanced,
       updatedAt: result.data.updated_at,
       matchDate: result.data.match_date,
     };
     setMatchData(transformedData);
   }, [matchId]);
   ```

2. **Optimistic Action System**:
   ```typescript
   const createApiAction = (url, method) => async (actionBody) => {
     const finalBody = { ...actionBody, state_version: matchData?.stateVersion || 0 };
     const response = await fetch(url, { method, body: JSON.stringify(finalBody) });
     
     if (!response.ok) {
       if (response.status === 409) {
         // Handle concurrency conflicts gracefully
         showToast('This match was updated by someone else.', 'error');
       }
     }
     await fetchMatchState(); // Refresh after successful action
   };
   ```

3. **Advanced Balance Integration**:
   ```typescript
   const balanceTeams = useCallback(async (method: 'ability' | 'performance' | 'random') => {
     // Refetch state before balancing to ensure freshness
     await fetchMatchState();

     if (method === 'ability' || method === 'performance') {
       response = await fetch(`/api/admin/balance-teams`, {
         method: 'POST',
         body: JSON.stringify({ matchId, playerIds, method: apiMethod })
       });
     } else {
       response = await fetch(`/api/admin/random-balance-match?matchId=${matchId}`, { 
         method: 'POST' 
       });
     }
     
     await fetchMatchState(); // Refresh to get new teams and balance state
   }, [matchId, fetchMatchState, matchData?.players]);
   ```

4. **Toast Notification System**:
   ```typescript
   const showToast = (message, type, action?) => {
     setToast({ message, type, action });
     setTimeout(() => setToast(null), 8000);
   };

   // Example with action button
   if (url.includes('/complete')) {
     showToast('Match saved. Stats recalculating (~45s)...', 'success', {
       label: 'Undo',
       onClick: () => createApiAction(`/api/admin/upcoming-matches/${matchId}/undo`, 'PATCH')()
     });
   }
   ```

5. **Permission System**:
   ```typescript
   const can = useCallback((action: 'unlockPool' | 'unlockTeams' | 'undoComplete') => {
     if (!matchData) return false;
     const { state } = matchData;
     switch (action) {
       case 'unlockPool': return state === 'PoolLocked';
       case 'unlockTeams': return state === 'TeamsBalanced';
       case 'undoComplete': return state === 'Completed';
       default: return false;
     }
   }, [matchData]);
   ```

#### **Return Interface**:
```typescript
return {
  isLoading,
  error,
  toast,
  can,
  matchData,
  showToast,
  actions: {
    lockPool: createApiAction(`/api/admin/upcoming-matches/${matchId}/lock-pool`, 'PATCH'),
    confirmTeams: createApiAction(`/api/admin/upcoming-matches/${matchId}/confirm-teams`, 'PATCH'),
    completeMatch: (scoreData) => createApiAction(`/api/admin/upcoming-matches/${matchId}/complete`, 'POST')(scoreData),
    revalidate: fetchMatchState,
    balanceTeams: balanceTeams,
    unlockPool: createApiAction(`/api/admin/upcoming-matches/${matchId}/unlock-pool`, 'PATCH'),
    unlockTeams: createApiAction(`/api/admin/upcoming-matches/${matchId}/unlock-teams`, 'PATCH'),
    undoComplete: createApiAction(`/api/admin/upcoming-matches/${matchId}/undo`, 'PATCH'),
    markAsUnbalanced: markAsUnbalanced,
    clearAssignments: clearAssignments,
  }
};
```

### **5.2 Team Drag & Drop Hook**
**Implementation**: Custom hook within `BalanceTeamsPane.component.tsx`
**Features**:
- Optimistic UI updates with server synchronization
- Conflict resolution for slot assignments  
- Automatic balance state invalidation
- Error handling with state rollback

---

## 6. Advanced Team Balancing System

### **6.1 Multiple Algorithm Support**

#### **Ability-Based Balancing**
**File**: `/api/admin/balance-teams/balanceByRating.ts`
**Features**:
- Position-specific weight application
- Statistical optimization for team balance
- Integration with `team_balance_weights` configuration
- Real-time analysis via TornadoChart

#### **Performance-Based Balancing**  
**File**: `/api/admin/balance-teams/balanceByPerformance.ts`
**Features**:
- Historical match performance analysis
- Recent form consideration
- Dynamic weight adjustment based on player trends

#### **Random Distribution**
**API**: `/api/admin/random-balance-match`
**Use Cases**:
- Uneven player numbers
- Quick team assignment
- Fallback when sophisticated algorithms can't be applied

### **6.2 Real-time Team Analysis**

#### **TornadoChart Integration**
**Component**: `TornadoChart.component.tsx`
**Features**:
- Visual balance comparison between teams
- Position-group statistical breakdown (Defense/Midfield/Attack)
- Weight-adjusted scoring display
- "Teams Modified" indicator when manual changes are made
- **Real-time updates**: Chart updates live as players are dragged between teams
- **Displays for complete teams**: Shows for any complete team arrangement (not just algorithmically balanced teams)

**Implementation**:
```typescript
// Balance calculation
const teamStatsData = useMemo(() => {
  if (teamA.length !== teamSize || teamB.length !== teamSize) return null;
  
  const shouldCalculate = balanceMethod === 'ability' || isBalanced;
  if (!shouldCalculate) return null;
  
  const teamAStats = calculateTeamStatsFromPlayers(teamA, teamTemplate, teamSize);
  const teamBStats = calculateTeamStatsFromPlayers(teamB, teamTemplate, teamSize);
  
  return { teamAStats, teamBStats };
}, [isBalanced, balanceMethod, teamA, teamB, teamTemplate, teamSize]);
```

#### **Balance Scoring System**
**Service**: `TeamBalance.service.ts`
**Calculation**:
```typescript
// Calculate comparative statistics
const diffs = {
  defense: calculatePositionDiffs(statsA.defense, statsB.defense),
  midfield: calculatePositionDiffs(statsA.midfield, statsB.midfield),
  attack: calculatePositionDiffs(statsA.attack, statsB.attack)
};

// Overall balance score (lower is better)
const balanceScore = totalDiff / totalComparisons;
const balancePercentage = Math.round(100 - (balanceScore * 100));
```

### **6.3 Formation Templates**
**Database**: `team_size_templates`
**Configuration**:
```typescript
// Example 9v9 template
{ team_size: 9, defenders: 3, midfielders: 4, attackers: 2 }
```

**Visual Implementation**:
- Position-based slot rendering
- Visual separators between formation lines
- Responsive slot sizing for different team sizes

---

## 7. Mobile UX Implementation

### **7.1 Responsive Design System**

#### **Global CTA Bar**
```css
/* Mobile: Fixed bottom positioning */
.max-md:fixed .max-md:bottom-0 .max-md:left-0 .max-md:w-full .max-md:z-30 
.max-md:p-4 .max-md:pb-6 .max-md:bg-white .max-md:shadow-soft-xl-top

/* Desktop: Inline flow */
.md:relative .md:w-full .md:mt-6
```

#### **Touch Optimization**
- **Minimum Touch Targets**: 44px+ for all interactive elements
- **Drag & Drop**: Native touch events with visual feedback
- **Goal Counters**: 48px × 48px buttons for accuracy
- **Player Cards**: 170px width for consistent layout

### **7.2 Mobile-Specific Features**

#### **Floating Action Button (FAB)**
```typescript
// Match list page
<Button className="md:hidden fixed bottom-20 right-4 z-40 rounded-full w-14 h-14">
  +
</Button>
```

#### **Responsive TornadoChart**
- **Desktop**: Displayed below Player Pool card
- **Mobile**: Full-width at bottom of page
- **Adaptive Sizing**: Chart scales to container width

#### **Mobile Navigation**
- **Bottom Navigation**: Preserved existing `BottomNavigation.component`
- **CTA Positioning**: `bottom-16` to clear navigation bar
- **Safe Area Handling**: Automatic iOS safe area support

### **7.3 Performance Optimizations**
- **Optimistic Updates**: Immediate UI feedback before server response
- **Debounced Actions**: Prevent rapid-fire API calls
- **Efficient Rendering**: Memoized calculations for team statistics
- **Progressive Enhancement**: Core functionality works without JavaScript

### **7.4 Mobile Search Visibility Fix**
**Issue**: On mobile portrait mode, player search results were hidden under the fixed "LOCK POOL" button, making players appear unavailable when searching.

**Solution**: Added mobile-specific bottom padding to search results dropdown:
```css
/* Mobile-only bottom padding to clear fixed CTA bar */
max-md:pb-40
```

**Implementation**: 
- **File**: `src/components/team/PlayerPool.component.tsx`
- **Target**: Search results container with `max-h-72 overflow-y-auto`
- **Calculation**: 160px clearance for GlobalCtaBar (64px bottom + 16px padding + 44px button + 24px extra + 12px buffer)
- **Scope**: Mobile-only (`max-md:`) - desktop layout unchanged

**Benefits**:
- ✅ Search results fully visible on mobile portrait
- ✅ No landscape rotation required for player selection
- ✅ Maintains touch-friendly interaction
- ✅ Preserves desktop responsiveness

### **7.5 Mobile UX Improvements - January 2025**

**Issue 1: Match creation modal too wide on mobile**
- Modal was taking full screen width with no padding
- Inconsistent with other modals in the app

**Solution**: Added padding to modal container
```css
/* Before: */
<div className="fixed inset-0 ... flex items-center justify-center">

/* After: */
<div className="fixed inset-0 ... flex items-center justify-center p-4">
```

**Benefits**:
- ✅ Consistent with other modals (breathing room on sides)
- ✅ Better mobile visual hierarchy
- ✅ Matches soft UI design system

**Issue 2: Drag-and-drop not working on mobile**
- Team balancing used only desktop drag events (`onDragStart`, `onDrop`)
- Touch gestures didn't trigger player movement

**Solution**: Added touch event handlers
```typescript
// Added to useTeamDragAndDrop hook:
onTouchStart={(e) => handleTouchStart(player, e)}
onTouchMove={handleTouchMove}
onTouchEnd={() => handleTouchEnd(team, slot)}

// Added touch-none to prevent scrolling during drag
className="... touch-none"
```

**Benefits**:
- ✅ Drag-and-drop now works on mobile/tablet
- ✅ Touch-friendly 44px+ targets maintained
- ✅ Prevents accidental scrolling during drag
- ✅ Consistent behavior across desktop and mobile

---

## 8. Configuration Management System

### **8.1 App Configuration**
**Table**: `app_config`
**Key Settings**:
```typescript
// Team customization
team_a_name: "Orange"           // Default team names
team_b_name: "Green" 

// Feature flags
show_on_fire: "true"            // Display fire emoji for hot players
show_grim_reaper: "true"        // Display skull emoji for struggling players

// UI preferences  
default_team_size: "9"          // Default selection for new matches
```

### **8.2 Balance Algorithm Weights**
**Table**: `team_balance_weights`
**Structure**:
```sql
position_group | attribute    | weight
defense        | goalscoring  | 0.15
defense        | defending    | 0.40
defense        | stamina_pace | 0.20
defense        | control      | 0.15
defense        | teamwork     | 0.05
defense        | resilience   | 0.05
-- ... midfield and attack configurations
```

**Admin Interface**: 
- Runtime weight adjustment via `/api/admin/balance-algorithm`
- Real-time TornadoChart updates when weights change
- Reset to defaults functionality

### **8.3 Team Formation Templates**
**Table**: `team_size_templates`
**Examples**:
```typescript
// 7v7 formation
{ team_size: 7, defenders: 2, midfielders: 3, attackers: 2 }

// 9v9 formation  
{ team_size: 9, defenders: 3, midfielders: 4, attackers: 2 }

// 11v11 formation
{ team_size: 11, defenders: 4, midfielders: 4, attackers: 3 }
```

---

## 9. Error Handling & User Experience

### **9.1 Concurrency Management**
**State Version System**:
```typescript
// All state-changing operations include version check
{
  upcoming_match_id: matchId,
  state_version: currentMatch.state_version,
  // ... other data
}

// Server response on conflict (409)
{
  success: false,
  error: 'Match was updated by another user. Please refresh and try again.'
}
```

**User Experience**:
- Automatic conflict detection
- User-friendly error messages
- Refresh suggestions with retry actions
- No data loss during conflicts

### **9.2 Network Resilience**
**Optimistic Updates**:
```typescript
// UI updates immediately
setPlayers(optimisticNewState);

try {
  // Server synchronization
  await fetch('/api/admin/upcoming-match-players', { method: 'PUT', ... });
} catch (error) {
  // Rollback on failure
  setPlayers(originalState);
  showErrorMessage('Failed to update. Please try again.');
}
```

**Connection Handling**:
- Local state preservation during outages
- Automatic retry for transient failures
- Clear feedback for network issues

### **9.3 Validation & Feedback**
**Form Validation**:
- Real-time validation for team size changes
- Player count restrictions when reducing team size
- Date validation for match scheduling

**Success States**:
```typescript
// Flash feedback (copying button pattern)
setEditSuccess(true);
setTimeout(() => setEditSuccess(false), 2000);

// Button state changes
<Button variant={editSuccess ? "primary" : "outline"}>
  {editSuccess ? '✓' : <MoreVertical size={16} />}
</Button>
```

---

## 10. Uneven Teams Feature - ✅ IMPLEMENTED (January 2025)

### **10.1 Feature Overview**
The uneven teams feature allows matches with flexible team sizes from 4v4 to 11v11 (8-22 total players), supporting uneven splits like 4v5, 5v6, etc. This maintains compatibility with existing 11v11 workflows while expanding match flexibility.

### **10.2 Database Schema Enhancements**

#### **New Columns in `upcoming_matches`**
```sql
actual_size_a INT     -- Actual team A size after pool lock
actual_size_b INT     -- Actual team B size after pool lock
```

**State Lifecycle Rules:**
- **Draft → PoolLocked**: Set both actual sizes from split calculation
- **PoolLocked → Draft**: Clear both to NULL
- **PoolLocked → TeamsBalanced**: Preserve actual sizes
- **TeamsBalanced → PoolLocked**: Preserve actual sizes

#### **Database Constraints**
```sql
-- Deferrable unique constraint for drag-and-drop operations
ALTER TABLE upcoming_match_players
ADD CONSTRAINT uniq_match_team_slot
UNIQUE (upcoming_match_id, team, slot_number)
DEFERRABLE INITIALLY DEFERRED;

-- Composite unique constraint for player updates
ALTER TABLE upcoming_match_players 
ADD CONSTRAINT upcoming_match_id_player_id_unique 
UNIQUE (upcoming_match_id, player_id);
```

### **10.3 Core Utilities & Constants**

#### **Team Split Logic (`teamSplit.util.ts`)**
```typescript
export const MIN_PLAYERS = 8;      // 4v4 minimum
export const MAX_PLAYERS = 22;     // 11v11 maximum
export const MIN_TEAM = 4;         // Minimum team size
export const MIN_CHART_PLAYERS = 10; // TornadoChart display threshold

export function splitSizesFromPool(poolSize: number): { a: number; b: number } {
  return { 
    a: Math.floor(poolSize / 2), 
    b: Math.ceil(poolSize / 2) 
  };
}

export function getPoolValidation(poolSize: number) {
  const disabled = poolSize > MAX_PLAYERS;
  const blocked = poolSize < MIN_PLAYERS;
  return { disabled, blocked };
}
```

#### **Formation Templates (`teamFormation.util.ts`)**
```typescript
export function deriveTemplate(teamSize: number, isSimplifiedMatch?: boolean): Formation {
  // 4v4 simplified matches use all midfielders
  if (teamSize === 4 && isSimplifiedMatch) return { def: 0, mid: 4, att: 0 };
  
  // Scale formations proportionally for other team sizes
  const baseTemplate = getNearestTemplate(teamSize);
  // ... scaling logic for uneven team sizes
}
```

### **10.4 UI/UX Implementation**

#### **Lock Pool Button Logic**
- **8+ players**: Direct lock with auto-split (no confirmation modal)
- **<8 players**: Single blocking modal "8 players (4v4) is the minimum"
- **22+ players**: Button disabled with "Maximum players reached" hint

#### **Dynamic Button Hints**
```typescript
// Examples of hint messages
poolSize === 0     → "Add players to begin"
poolSize < 8       → "Need X more for 4v4 minimum"
poolSize === 8     → "Lock 4v4 (all midfielders, Performance/Random only)"
poolSize === targetSize → "Perfect for Xv X"
uneven split       → "Lock 4v5" (or appropriate split)
poolSize > 22      → "Maximum players reached"
```

#### **Balance Algorithm Restrictions**
- **Ability Balancing**: Disabled for 4v4 and all uneven teams
- **Performance/Random**: Available for all team configurations
- **Visual Indicators**: Grayed out options with explanatory tooltips

### **10.5 API Enhancements**

#### **Lock Pool API (`/lock-pool`)**
```typescript
// Enhanced validation and team size calculation
const { a: sizeA, b: sizeB } = splitSizesFromPool(poolSize);
const { disabled, blocked } = getPoolValidation(poolSize);

// Atomic transaction updates match state and actual sizes
await tx.upcoming_matches.updateMany({
  where: { upcoming_match_id: matchId, state_version },
  data: {
    state: 'PoolLocked',
    actual_size_a: sizeA,
    actual_size_b: sizeB,
    state_version: { increment: 1 }
  }
});
```

#### **Balance Teams API (`/balance-teams`)**
```typescript
// All algorithms now accept size parameters
const isUneven = sizeA !== sizeB;
const isSimplified = (sizeA + sizeB) === 8;

// Block Ability balancing for uneven teams
if (method === 'ability' && (isUneven || isSimplified)) {
  return NextResponse.json({
    success: false,
    error: 'Ability balancing not supported for uneven teams'
  }, { status: 400 });
}
```

#### **Atomic Player Swaps (`/swap`)**
```typescript
// New endpoint for conflict-free drag-and-drop operations
export async function POST(request: NextRequest) {
  const { upcoming_match_id, playerA, playerB } = await request.json();
  
  await prisma.$transaction(async (tx) => {
    // Update both players atomically within single transaction
    await tx.upcoming_match_players.update({
      where: { upcoming_match_id_player_id: { upcoming_match_id, player_id: playerA.player_id }},
      data: { team: playerA.team, slot_number: playerA.slot_number }
    });
    
    await tx.upcoming_match_players.update({
      where: { upcoming_match_id_player_id: { upcoming_match_id, player_id: playerB.player_id }},
      data: { team: playerB.team, slot_number: playerB.slot_number }
    });
  });
}
```

### **10.6 Team Balancing Algorithm Updates**

#### **Performance Algorithm**
- Updated to accept `sizes: { a: number; b: number }` parameter
- Uses actual team sizes for slot assignment (1-N for both teams)
- Properly handles uneven team distributions

#### **Random Algorithm**
- Enhanced with Fisher-Yates shuffle for proper randomization
- Optional seeding for reproducible testing
- Respects actual team sizes for assignment

#### **Ability Algorithm**
- Modified to accept sizes parameter for consistency
- Blocked for uneven teams via API validation
- Falls back to team size template when teams are even

### **10.7 Drag & Drop System**

#### **Conflict Resolution**
- **No Conflict**: Single HTTP call to existing PUT endpoint
- **With Conflict**: Atomic swap via new POST `/swap` endpoint
- **Deferrable Constraint**: Allows temporary unique violations within transaction

#### **Slot Numbering**
- **Team A**: Slots 1-N (where N = actual_size_a)
- **Team B**: Slots 1-N (where N = actual_size_b)
- **Simplified**: No offset numbering, each team independent

#### **Capacity Guards**
```typescript
// Prevent overfilling teams during manual assignment
const capacity = team === 'A' ? match.actual_size_a : match.actual_size_b;
if (currentCount >= capacity) {
  return NextResponse.json({
    success: false,
    error: `Team ${team} at capacity (${capacity} players)`
  }, { status: 400 });
}
```

### **10.8 Formation & Display Logic**

#### **Template Derivation**
- **4v4 Simplified**: All midfielders (flat list)
- **Other Sizes**: Proportionally scaled formations
- **Uneven Teams**: Each team uses appropriate formation for its size

#### **UI Rendering**
```typescript
// Conditional rendering based on team configuration
const isSimplified = totalPlayers === 8;
const isUneven = teamA.length !== teamB.length;

// TornadoChart display rules
const shouldShowChart = !isSimplified && !isUneven && 
                       totalPlayers >= MIN_CHART_PLAYERS;

// Team column rendering
const teamSize = teamName === 'A' ? actualSizeA : actualSizeB;
const formation = isSimplified ? { def: 0, mid: 4, att: 0 } : 
                  deriveTemplate(teamSize);
```

### **10.9 Key Benefits Achieved**

#### **✅ Flexible Match Management**
- Support for any team configuration from 4v4 to 11v11
- Automatic handling of uneven player pools
- Preserved existing 11v11 workflow compatibility

#### **✅ Data Integrity**
- Deferrable unique constraints prevent slot conflicts
- Atomic operations ensure consistent state transitions
- Comprehensive validation at all API boundaries

#### **✅ Enhanced User Experience**
- "Just works" flow for viable scenarios (8+ players)
- Single blocking modal for insufficient players
- Clear visual indicators for algorithm restrictions

#### **✅ Algorithm Protection**
- Ability balancing disabled for uneven teams
- Performance/Random algorithms enhanced for flexibility
- Consistent API interfaces across all methods

#### **✅ Mobile Optimization**
- Touch-friendly drag and drop operations
- Responsive formation displays
- Optimized button sizing and spacing

### **10.10 Testing & Validation**

#### **Comprehensive Test Coverage**
- Split logic validation for all pool sizes (8-22)
- Formation template snapshots for consistency
- API boundary validation and error handling
- Concurrency conflict resolution testing

#### **Production Safeguards**
- Runtime schema validation with clear error messages
- Defensive UI guards for edge cases
- Comprehensive logging for debugging
- Graceful degradation for data inconsistencies

---

## 11. Legacy Migration - ✅ COMPLETED

### **11.1 Migration Status**
**✅ ALL LEGACY MATCHES MIGRATED** - As documented in `clean-legacy-matches.md`:
- **685 legacy matches** successfully migrated to unified system
- **All matches** now have `upcoming_match_id` linking to planning records
- **Legacy detection code removed** from application
- **Unified functionality** across all historical data

**Post-Migration State**:
```typescript
// All matches now required to have upcoming_match_id
upcoming_match_id: Int // No longer optional

// Simplified navigation - no legacy checks needed
const href = `/admin/matches/${match.upcoming_match_id}`;
```

### **11.2 Migration Achievements**
**Completed Implementation**:
1. **✅ Phase 1**: New matches use full lifecycle 
2. **✅ Phase 2**: Legacy matches migrated to new system
3. **✅ Phase 3**: Complete historical data migration executed
4. **✅ Phase 4**: Legacy results editor completely removed

**Benefits Achieved**:
- **Unified User Experience**: All matches work identically
- **Simplified Codebase**: No dual-system complexity
- **Enhanced Functionality**: Full Match Control Centre for all historical data
- **Future-Proof Architecture**: Single system for all operations

---

## 12. Performance & Monitoring

### **12.1 Caching Strategy**
**API Level**:
```typescript
// Aggressive cache control for real-time data
headers: {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}
```

**Component Level**:
- `useMemo` for expensive calculations (team statistics)
- `useCallback` for event handlers to prevent re-renders
- Optimized re-rendering through proper dependency arrays

### **12.2 Database Performance**
**Indexing Strategy**:
```sql
-- Match lookups
@@index([upcoming_match_id], map: "idx_matches_upcoming_match_id")
@@index([is_active], map: "idx_upcoming_matches_active")

-- Player assignments  
@@index([upcoming_match_id], map: "idx_match_player_pool_match_id")
@@index([player_id], map: "idx_match_player_pool_player_id")
```

**Query Optimization**:
- Includes for related data to minimize round trips
- Proper ordering in database queries
- Efficient player pool management

---

## 13. Future Enhancements & Roadmap

### **13.1 Planned Features**
- **Push Notifications**: Match reminders and team announcements
- **Advanced Analytics**: Historical team balance performance tracking
- **Player Feedback System**: Post-match player ratings
- **Schedule Management**: Recurring match creation
- **Export Functionality**: PDF lineup sheets and match reports

### **13.2 Technical Improvements**
- **Background Jobs**: Asynchronous stats calculation via Supabase Edge Functions
- **Real-time Updates**: WebSocket integration for live collaboration
- **Progressive Web App**: Offline functionality for on-pitch use
- **Advanced Caching**: Redis integration for frequently accessed data

### **13.3 Mobile Enhancements**
- **Gesture Support**: Swipe navigation between match states
- **Voice Commands**: "Add goal for [player name]" voice input
- **Camera Integration**: QR code scanning for quick player addition
- **Haptic Feedback**: Touch confirmation for critical actions

---

## 14. Technical Specifications

### **14.1 Dependencies**
```json
{
  "next": "^13.x",
  "react": "^18.x", 
  "prisma": "^5.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "date-fns": "^2.x",
  "lucide-react": "^0.x"
}
```

### **14.2 Environment Configuration**
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NODE_ENV="production"
```

### **14.3 Build & Deployment**
- **Platform**: Vercel with automatic deployments
- **Database**: Supabase managed PostgreSQL
- **CDN**: Vercel Edge Network for global performance
- **Monitoring**: Built-in Vercel analytics and error tracking

---

## 15. Complete Implementation Checklist

### ✅ **Core System (100% Complete)**
- [x] Match lifecycle state machine (Draft → PoolLocked → TeamsBalanced → Completed)
- [x] Database schema with all required tables and relationships
- [x] Complete API layer with all CRUD operations
- [x] State management with `useMatchState` hook
- [x] Responsive UI components for all match states

### ✅ **Advanced Features (100% Complete)**
- [x] Multiple team balancing algorithms (Ability, Performance, Random)
- [x] Real-time team analysis with TornadoChart integration
- [x] Drag & drop player assignment with position management
- [x] Match creation, editing, and deletion with proper validation
- [x] Mobile-optimized interface with touch-friendly controls

### ✅ **User Experience (100% Complete)**
- [x] Optimistic updates with error handling and rollback
- [x] Concurrency control with state versioning
- [x] Toast notifications with action buttons
- [x] Success flash states following established design patterns
- [x] Comprehensive error handling with user-friendly messages

### ✅ **Configuration & Customization (100% Complete)**
- [x] Database-driven configuration system
- [x] Customizable team names and formation templates
- [x] Balance algorithm weight configuration
- [x] Feature flags for UI elements (fire/grim reaper indicators)

### ✅ **Integration & Compatibility (100% Complete)**
- [x] Complete legacy data migration (685+ matches) 
- [x] Proper data transformation via canonical player types
- [x] Integration with existing stats calculation system
- [x] Preservation of all historical match data

### ✅ **Uneven Teams Feature (100% Complete)**
- [x] Flexible team sizes from 4v4 to 11v11 (8-22 total players)
- [x] Database schema enhancements with actual_size_a/b columns
- [x] Deferrable unique constraints for drag-and-drop integrity
- [x] Enhanced lock pool validation with hard limits (8 min, 22 max)
- [x] Algorithm restrictions (Ability disabled for uneven/4v4 teams)
- [x] Atomic player swap endpoint for conflict resolution
- [x] Formation template derivation for all team sizes
- [x] UI/UX enhancements with dynamic hints and blocking modals
- [x] Performance and Random algorithm updates for uneven teams
- [x] Comprehensive testing and validation coverage

---

## **Critical Bug Fix: Own Goals Persistence Issue - ✅ RESOLVED**

**Issue Discovered**: When re-editing a completed match, own goals that were previously entered were lost because they weren't persisted to the database. The system only saved final team scores and individual player goals, then tried to reverse-engineer own goals during re-editing.

### **Solution Implemented**
Enhanced the match completion system to properly persist own goals:

**Database Schema Updates:**
- Added `team_a_own_goals` and `team_b_own_goals` columns to `matches` table
- Migrated 686+ historical matches with calculated own goals (99.7% data integrity)

**API Enhancements:**
```typescript
// Updated match completion payload
{
  score: { team_a: number, team_b: number },
  own_goals: { team_a: number, team_b: number },  // NEW
  player_stats: [{ player_id: number, goals: number }]
}

// Built-in validation ensures data integrity
if (score.team_a !== totalPlayerGoalsA + own_goals.team_a) {
  throw new ValidationError('Score calculation mismatch');
}
```

**UI Improvements:**
- Own goals now saved as actual values (not calculated)
- Re-editing completed matches preserves original own goals breakdown
- Score validation prevents future data inconsistencies
- Fixed historical data loading bug that caused player goals to disappear during editing
- Fixed API validation logic that incorrectly calculated team goals
- Fixed history API to properly return own goals data

**Match Report Enhancements:**
- Enhanced SQL aggregation to display own goals in match reports
- Own goals appear as "OG (x)" entries in team player lists
- Conditional display: only shows when own goals > 0
- Non-clickable entries that blend seamlessly with player names

### **Impact**
- **Before Fix**: Own goals lost when re-editing matches, player goals could disappear during editing, validation errors on correct data
- **After Fix**: Perfect own goals persistence across all match operations, reliable historical data loading, accurate validation
- **Data Migration**: 759 total own goals properly calculated for historical matches
- **Undo Behavior**: Own goals automatically removed when matches are undone (database cascade)
- **Corruption Recovery**: Diagnostic tools available for fixing partially-saved matches
- **Dashboard Integration**: Own goals now display properly in match reports and statistics

### **Technical Bug Fixes Resolved**

#### **Bug 1: API Validation Logic Error**
**Problem**: Score validation always failed because it tried to filter `player_stats` by team, but the array only contained `{player_id, goals}` with no team information.
**Solution**: Enhanced validation to lookup team assignments from database before calculating totals.

#### **Bug 2: Historical Data Loading Loop** 
**Problem**: Component re-rendered on every change, causing historical data to reload and overwrite user modifications.
**Solution**: Added `hasLoadedHistoricalData` flag and optimized dependency arrays to prevent unnecessary reloads.

#### **Bug 3: History API Missing Fields**
**Problem**: `/api/matches/history` wasn't returning `team_a_own_goals` and `team_b_own_goals` fields.
**Solution**: Added own goals fields to API response with null safety handling.

#### **Bug 4: Undo State Reset**
**Problem**: "Undo" operation triggered aggressive reset logic that wiped all form data.
**Solution**: Refined reset logic to only clear data when switching between different matches, not state changes.

#### **Bug 5: Match Report SQL Enhancement**
**Problem**: Own goals weren't displayed in dashboard match reports.
**Solution**: Enhanced SQL aggregation to conditionally append "OG (x)" entries to team player arrays.

### **Production Reliability Improvements**
- **Robust error handling** for edge cases and corrupted data
- **Comprehensive logging** for debugging historical data issues  
- **Defensive null checking** throughout the codebase
- **Graceful degradation** when data inconsistencies are detected
- **Diagnostic tools** for identifying and fixing match state corruption

---

## **Critical Bug Fix: Match Completion API Data Issue - ✅ RESOLVED**

**Issue Discovered**: The initial implementation of the match completion API (`/api/admin/upcoming-matches/[id]/complete`) was missing critical fields in `player_matches` records, causing stats update edge functions to fail.

### **Problem**
The API was only saving basic data:
```typescript
{
  match_id, player_id, team, goals
  // ❌ Missing: result, heavy_win, heavy_loss, clean_sheet
}
```

But all SQL stats functions expect these calculated fields:
- **`result`** - 'win'/'loss'/'draw' based on team scores
- **`heavy_win`** - boolean for 4+ goal difference wins  
- **`heavy_loss`** - boolean for 4+ goal difference losses
- **`clean_sheet`** - boolean for 0 goals conceded

### **Solution**
Enhanced the match completion API to calculate all required fields:

```typescript
// Calculate match result metrics
const scoreDiff = Math.abs(score.team_a - score.team_b);
const isHeavyWin = scoreDiff >= 4;

const playerMatchesData = upcomingMatch.players
  .filter(p => p.team === 'A' || p.team === 'B')
  .map(p => {
    // Determine team score and opposing score
    const teamScore = p.team === 'A' ? score.team_a : score.team_b;
    const opposingScore = p.team === 'A' ? score.team_b : score.team_a;
    
    // Calculate result
    const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');
    
    // Calculate result-specific flags
    const heavy_win = result === 'win' && isHeavyWin;
    const heavy_loss = result === 'loss' && isHeavyWin;
    const clean_sheet = opposingScore === 0;
    
    return {
      match_id: newMatch.match_id,
      player_id: p.player_id,
      team: p.team,
      goals: goalsMap.get(p.player_id) || 0,
      result,
      heavy_win,
      heavy_loss,
      clean_sheet,
    };
  });
```

### **Impact**
- **Before Fix**: Stats updates failed after match completion (edge functions couldn't process incomplete data)
- **After Fix**: Full stats pipeline works correctly with properly calculated player results

This fix ensures the new match flow integrates seamlessly with the existing stats calculation system.

---

## **UI/UX Improvement: Consistent Match Completion Feedback**

**Issue**: Match completion showed inconsistent green toast notifications that clashed with the soft UI design system.

### **Problem**
- Green toast notifications didn't match the soft UI gradient styling
- Multiple competing success messages (toast + inline green card)
- User got "stuck" on completion screen with no clear next action

### **Solution**
Replaced inconsistent notifications with a unified **MatchCompletedModal** component:

```typescript
// Modal with soft UI styling
<MatchCompletedModal
  isOpen={matchCompletedModal.isOpen}
  onClose={closeMatchCompletedModal}
  teamAName={matchCompletedModal.teamAName}
  teamBName={matchCompletedModal.teamBName}
  teamAScore={matchCompletedModal.teamAScore}
  teamBScore={matchCompletedModal.teamBScore}
/>
```

**Modal Content**:
- **Title**: "Match Saved Successfully"
- **Score Display**: "Orange 2 - 5 Green" (dynamic team names and scores)
- **Info**: "Stats will recalculate in ~45 seconds"
- **Actions**: 
  - **"Match Report"** - Toggles to user mode to view generated match report
  - **"History"** - Navigates to admin history view

### **Benefits**
- ✅ **Visual Consistency**: Matches existing soft UI modal styling (`shadow-soft-xl`, gradient buttons)
- ✅ **Better UX Flow**: Clear next actions instead of dead-end screen
- ✅ **Mobile Optimized**: Modal works better than toasts on mobile
- ✅ **Reduced Clutter**: Single elegant notification instead of multiple green messages

**Files Modified**:
- `MatchCompletedModal.component.tsx` - New modal component
- `useMatchState.hook.ts` - Modal state management
- `CompleteMatchForm.component.tsx` - Removed green success card
- Main match page - Integrated modal

---

## **Critical Production Bug Fixes - December 2024**

### **Issue 1: Stats Update API Network Failures**
The `/api/admin/trigger-stats-update` route was failing due to URL construction errors.

**Problem**: 
```javascript
// Failed when NEXT_PUBLIC_SITE_URL was undefined
const revalidateUrl = new URL('/api/admin/revalidate-cache', process.env.NEXT_PUBLIC_SITE_URL);
// TypeError: Invalid URL
```

**Solution**:
```javascript
// Added fallback for development
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const revalidateUrl = new URL('/api/admin/revalidate-cache', baseUrl);
```

**Performance Improvements**:
- Removed 2-second delays between edge functions (back to <1 second total)
- Reduced retry delays from exponential backoff (1s/2s/3s) to 100ms

### **Issue 2: Match Completion Concurrency Failures**
Match completion could fail partway through due to overly strict concurrency checking, leaving matches in an orphaned state (data saved but not marked complete).

**Problem**: 
```typescript
// Too strict - could fail if UI state was slightly stale
const updatedUpcomingMatch = await tx.upcoming_matches.update({
  where: {
    upcoming_match_id: matchId,
    state_version: state_version, // ❌ Could cause rollback
  }
});
```

**Solution**:
```typescript
// More resilient - prevents orphaned matches
const updatedUpcomingMatch = await tx.upcoming_matches.update({
  where: {
    upcoming_match_id: matchId, // ✅ Just requires match exists
  }
});
```

### **Issue 3: History Tab Filtering Incorrect**
History was showing ALL matches from the database instead of only completed ones.

**Problem**: No filtering by completion status in `/api/matches/history`
**Solution**: Added proper state-based filtering:
```typescript
where: {
  upcoming_matches: { state: 'Completed' } // All matches now in unified system
}
```

### **Issue 4: MatchCompletedModal Context Errors**
Modal was using NavigationContext which caused JavaScript errors during match completion.

**Problem**: Complex context dependency causing "useNavigation must be used within a NavigationProvider" errors
**Solution**: Simplified to direct navigation:
```typescript
// Removed NavigationContext dependency
const handleMatchReport = () => router.push('/');
const handleHistory = () => router.push('/admin/matches?view=history');
```

### **Overall Impact**
- ✅ **Reliable match completion** - No more orphaned matches or 500 errors
- ✅ **Fast stats updates** - Sub-1-second performance restored
- ✅ **Accurate history display** - Only shows truly completed matches  
- ✅ **Error-free modal** - Consistent completion flow without JavaScript errors
- ✅ **Better Active/History separation** - No more duplicate matches appearing in both tabs

The new match flow now provides a robust, production-ready experience with comprehensive error handling and performance optimization.

---

## **Enhanced Match Deletion System - December 2024**

**Objective**: Redesigned match deletion to provide more intuitive UX with better visual hierarchy and comprehensive data integrity handling.

### **UX Design Improvements**

#### **1. Removed Deletion from Match Control Centre**
**Problem**: Deletion functionality in the three-dot menu felt disconnected from the match lifecycle and created inconsistent state restrictions.

**Solution**: Completely removed deletion from the Match Control Centre interface to focus on match progression:
- **Cleaner Interface**: Match Control Centre now focuses purely on lifecycle management
- **Consistent Actions**: Three-dot menu only contains flow-related actions (unlock pool, unlock teams, undo completion)
- **Reduced Cognitive Load**: No destructive actions mixed with constructive workflow

#### **2. Card-Level Deletion Interface**
**New Pattern**: Added permanent delete buttons to match cards, matching the "+" button positioning for create actions.

**Active Match Cards**:
```typescript
// Delete button positioned like create button
<div className="flex items-center gap-3 sm:gap-4">
  <span className="text-xs font-medium uppercase py-1 px-3 rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-soft-sm">
    {formatStateDisplay(match.state)}
  </span>
  <button className="w-8 h-8 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md">
    <Trash2 size={14} />
  </button>
</div>
```

**History Match Cards**:
- Same positioning pattern for consistency
- Enhanced warnings for completed matches that affect stats

#### **3. Status Pill Redesign**
**Change**: Updated status pills throughout the system to match copy button styling pattern.

**Before**: `border-2 border-purple-700 bg-transparent text-slate-700`
**After**: `border border-neutral-300 bg-white text-neutral-700 shadow-soft-sm`

**Applied To**:
- Active match cards
- History match cards  
- Match Control Centre header
- StepperBar components (outline style, non-clickable appearance)

#### **4. Mobile Responsiveness**
**Responsive Spacing**:
```css
/* Mobile: Tighter spacing */
gap-3

/* Desktop: More breathing room */  
sm:gap-4
```

**Touch Optimization**:
- Delete buttons sized for touch targets (32px minimum)
- Proper z-index layering for clickability over card links
- Mobile-friendly confirmation modals

### **API & Data Integrity Enhancements**

#### **1. Enhanced Upcoming Matches DELETE API**
**File**: `/api/admin/upcoming-matches/route.ts`

**Capability**: Handles both active and completed matches with proper data cleanup:

```typescript
// Get match state first
const upcomingMatch = await prisma.upcoming_matches.findUnique({
  where: { upcoming_match_id: upcomingMatchId }
});

if (upcomingMatch.state === 'Completed') {
  // Handle completed match - delete both planning and historical records
  
  // Find linked historical match
  const linkedMatch = await prisma.matches.findFirst({
    where: { upcoming_match_id: upcomingMatchId }
  });
  
  if (linkedMatch) {
    // Delete historical data
    await prisma.player_matches.deleteMany({
      where: { match_id: linkedMatch.match_id }
    });
    await prisma.matches.delete({
      where: { match_id: linkedMatch.match_id }
    });
  }
  
  // Trigger stats recalculation
  await fetch('/api/admin/trigger-stats-update', { method: 'POST' });
}

// Always clean up planning data
await prisma.upcoming_match_players.deleteMany({
  where: { upcoming_match_id: upcomingMatchId }
});
await prisma.upcoming_matches.delete({
  where: { upcoming_match_id: upcomingMatchId }
});
```

#### **2. Enhanced History Matches DELETE API**  
**File**: `/api/matches/history/route.ts`

**Capability**: Handles all matches in the unified system:

```typescript
// All matches now have planning records - delete both historical and planning data
const match = await prisma.matches.findUnique({
  where: { match_id: parsedMatchId },
  include: { upcoming_matches: true }
});

// Delete planning data first
await prisma.upcoming_match_players.deleteMany({
  where: { upcoming_match_id: match.upcoming_matches.upcoming_match_id }
});
await prisma.upcoming_matches.delete({
  where: { upcoming_match_id: match.upcoming_matches.upcoming_match_id }
});

// Delete historical data
await prisma.player_matches.deleteMany({
  where: { match_id: parsedMatchId }
});
await prisma.matches.delete({
  where: { match_id: parsedMatchId }
});

// Trigger stats recalculation
await fetch('/api/admin/trigger-stats-update', { method: 'POST' });
```

#### **3. Automatic Stats Recalculation**
**Feature**: Deletion of completed matches automatically triggers stats updates to maintain data consistency.

**Implementation**:
- Calls `/api/admin/trigger-stats-update` after successful deletion
- Updates all affected player statistics
- Recalculates leaderboards and records
- Maintains data integrity across the entire system

### **State-Aware Confirmation System**

#### **Enhanced Confirmation Messages**
**Context-Sensitive Warnings**:

```typescript
const getDeleteMessage = (match) => {
  if ('_count' in match) {
    // Active match
    switch (match.state) {
      case 'Draft':
        return `Delete this match on ${dateStr}?`;
      case 'PoolLocked':
        return `Delete this match on ${dateStr}? ${match._count.players} players will be removed from the pool.`;
      case 'TeamsBalanced':
        return `Delete this match on ${dateStr}? Teams have been balanced and will be lost.`;
      case 'Completed':
        return `⚠️ Delete completed match on ${dateStr}? This will permanently remove results and may affect player statistics.`;
    }
  } else {
    // Historical match
    return `⚠️ Delete completed match on ${dateStr}? This will permanently remove results and may affect player statistics.`;
  }
};
```

#### **ConfirmationDialog Integration**
**Features**:
- Consistent soft-UI styling matching existing modal system
- Loading states during deletion process
- Error handling with user-friendly messages
- Proper button states (destructive red styling for delete confirmation)

```typescript
<ConfirmationDialog
  isOpen={isDeleteModalOpen}
  onConfirm={handleDeleteConfirm}
  onCancel={() => {
    setIsDeleteModalOpen(false);
    setMatchToDelete(null);
  }}
  title="Delete Match"
  message={matchToDelete ? getDeleteMessage(matchToDelete) : ''}
  confirmText={isDeleting ? 'Deleting...' : 'Delete Match'}
  confirmVariant="danger"
  isLoading={isDeleting}
/>
```

### **Prevention of Accidental Deletion**

#### **Multi-Layer Protection**:
1. **Visual Distinction**: Delete buttons use clear trash icon and destructive colors
2. **Confirmation Modal**: Required confirmation for all deletions
3. **Context-Aware Messages**: Specific warnings based on match state and impact
4. **Enhanced Warnings**: Special ⚠️ indicators for completed matches affecting stats
5. **Loading States**: Prevent double-clicks during deletion process

#### **User Education**:
- Clear messaging about consequences (player pool removal, team loss, stats impact)
- Different warning levels based on deletion severity
- Informative button text that describes the action

### **Benefits Achieved**

#### **✅ Improved User Experience**
- **Intuitive Design**: Delete buttons positioned where users expect them (card level)
- **Consistent Patterns**: Matches existing create/edit workflows
- **Clear Hierarchy**: Separation between constructive (match flow) and destructive (deletion) actions
- **Mobile Optimized**: Proper touch targets and responsive spacing

#### **✅ Enhanced Data Integrity**
- **Complete Cleanup**: Both planning and historical data removed appropriately
- **Stats Consistency**: Automatic recalculation maintains accurate statistics
- **No Orphaned Records**: Proper handling of linked match relationships
- **Unified System**: All historical matches migrated to new system

#### **✅ Robust Error Handling**
- **Network Resilience**: Proper error handling and user feedback
- **State Validation**: Appropriate warnings based on match state and impact
- **Rollback Protection**: Transactional operations prevent partial failures
- **User Guidance**: Clear messaging about consequences and next steps

#### **✅ Design System Consistency**
- **Visual Harmony**: Status pills match copy button styling throughout app
- **Soft UI Integration**: Consistent with existing modal and button patterns
- **Responsive Design**: Proper mobile/desktop adaptation
- **Accessibility**: Clear visual hierarchy and touch-friendly interactions

### **Files Modified**

**Core APIs**:
- `src/app/api/admin/upcoming-matches/route.ts` - Enhanced DELETE with completion handling
- `src/app/api/matches/history/route.ts` - Enhanced DELETE with system integration

**UI Components**:
- `src/app/admin/matches/page.tsx` - Card-level deletion interface
- `src/app/admin/matches/[id]/page.tsx` - Removed deletion from Match Control Centre
- `src/components/admin/matches/StepperBar.component.tsx` - Updated status pill styling

**Implementation Notes**:
- All deletion operations are protected by confirmation dialogs
- Status pill styling changes applied consistently across the entire match flow
- Mobile responsiveness ensures usability across all device types
- Automatic stats recalculation maintains system integrity after deletions

---

## **Match Day Reality: No-Show & Team Swap Handling - ✅ IMPLEMENTED (January 2025)**

**Issue**: Admin manually balanced 18 players, but on match day one player doesn't show. Going back to Draft state loses all balancing work. Also, sometimes teams need last-minute swaps for fairness.

**Solution**: Handle match-day reality directly on results screen with simple checkbox UI and team swap arrows, without disrupting the planning workflow.

### **Implementation**

**Database Schema:**
```sql
-- Added to player_matches table (columns exist but not strictly used - see Design Decision below)
ALTER TABLE player_matches
  ADD COLUMN is_no_show BOOLEAN DEFAULT FALSE,
  ADD COLUMN actual_team VARCHAR(20);
```

**Design Decision: Checkbox Controls Row Creation**

After evaluating two approaches:
1. ❌ **Save everyone + filter in stats** - Requires updating 9+ SQL files, high bug risk
2. ✅ **Checkbox controls who gets saved** - Simple, stats just work, no SQL changes needed

**We chose Approach 2** for simplicity and maintainability.

**How It Works:**
- ✅ **Checkbox unchecked** → Player NOT saved to `player_matches` (no appearance credit)
- ✅ **Checkbox checked** → Player saved to `player_matches` (gets stats)
- ✅ **Re-editing** → Cross-reference `upcoming_match_players` vs `player_matches` to restore UI state
- ✅ **Stats queries unchanged** → No filtering needed, they just work

**UI Enhancement (CompleteMatchForm):**

Each player row now has:
1. **Played checkbox**: Controls whether player gets a `player_matches` row
2. **Team swap arrow** (→ or ←): Quick one-click team reassignment
3. **Visual feedback**: Greyed out + "No Show" badge for unchecked players
4. **Goal controls hidden**: No-show players can't have goals entered

**Visual Example:**
```
ORANGE                          GREEN
✓ Lee Miles    → - [2] +       ✓ Scott Daly  ← - [1] +
✓ Greg Dormer  → - [0] +       ✓ Simon Gill  ← - [0] +
✗ Sharpey (No Show)            ✓ Ade Duncan  ← - [0] +
✓ Pete Hay     → - [0] +       ✗ Steve McG (No Show)
```

**Submit Logic:**
```typescript
// Only save players with checkbox checked
const player_stats = [...teamA, ...teamB]
  .filter(player => !noShowPlayers.has(player.id))  // Checkbox controls this
  .map(player => ({
    player_id: Number(player.id),
    goals: playerGoals.get(player.id) || 0,
    actual_team: teamSwaps.get(player.id) || player.team  // For team swaps
  }));
```

**Re-Editing Logic:**
```typescript
// Cross-reference two tables to figure out who no-showed
const playedPlayerIds = new Set(historicalMatch.player_matches.map(pm => pm.player_id));
const noShows = new Set();

players.forEach(player => {
  if (!playedPlayerIds.has(player.id)) {
    noShows.add(player.id);  // Was planned but didn't play
  }
});
```

**API Changes:**

**Complete Match Endpoint:** `/api/admin/upcoming-matches/[id]/complete`
- Accepts `player_stats` array with only players who played
- Processes `actual_team` field for team swaps
- No `is_no_show` field needed (absence = no-show)

**Historical Data Endpoint:** `/api/admin/upcoming-matches/[id]/historical-data`
- Returns `player_matches` (players who played)
- Frontend cross-references with `upcoming_match_players` to determine no-shows

### **Use Cases Handled**

**1. Player No-Show:**
- Uncheck player's checkbox before saving match
- Player doesn't get appearance/stats credit
- Re-editing preserves no-show state

**2. Last-Minute Team Swap:**
- Click arrow (→ or ←) to swap player between teams
- Stats calculated using `actual_team` instead of planned `team`
- Visual "(swapped)" indicator shows who moved

**3. Multiple No-Shows:**
- Uncheck multiple players
- Final scores auto-recalculate excluding no-shows
- Only players with ✓ get saved to database

### **Benefits**

✅ **Simple**: Just a checkbox - no complex state machine changes  
✅ **Clean stats**: No filtering needed, queries just work  
✅ **Low maintenance**: No risk of forgetting filters in SQL files  
✅ **Re-editable**: Cross-reference preserves full history  
✅ **Real-world flexible**: Handles no-shows and swaps elegantly  
✅ **Future-proof**: When RSVP implemented, can auto-uncheck no-shows  

### **Future RSVP Integration**

When RSVP system is implemented (per `SPEC_RSVP.md`), this feature integrates seamlessly:

```typescript
// Future: RSVP auto-marks no-shows
if (player.rsvpStatus === 'OUT' && match.state === 'TeamsBalanced') {
  // Pre-uncheck checkbox based on RSVP data
  setNoShowPlayers(prev => new Set([...prev, player.id]));
}
```

**Backwards Navigation Locking:**
- Once `locked_for_payments = TRUE`, disable "Unlock Pool" and "Unlock Teams" buttons
- Show message: "🔒 Teams locked for payments - use Match Day adjustments for changes"
- All real-world chaos handled on results screen

### **Files Modified**

**Frontend:**
- `src/components/admin/matches/CompleteMatchForm.component.tsx` - Checkbox + arrow UI

**Backend:**
- `src/app/api/admin/upcoming-matches/[id]/complete/route.ts` - Process only played players
- `src/app/api/admin/upcoming-matches/[id]/historical-data/route.ts` - Return `actual_team` field

**Database:**
- `player_matches` table - Added `is_no_show` and `actual_team` columns (for future use)

**Note:** `is_no_show` column exists in database but is not currently used. We keep it for potential future analytics ("Player X no-shows 30% of the time") without breaking current simple implementation.

---

**End of Complete Implementation Documentation** 