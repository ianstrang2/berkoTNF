# Match Control Centre Refactor - Implementation Plan

**Created:** December 2025  
**Status:** ✅ COMPLETE (Dec 2, 2025)  
**Risk Level:** HIGH - Core functionality  
**Related:** `MERMAID_Match_Control.md`, `SPEC_match-control-centre.md`

---

## Executive Summary

Refactored the Match Control Centre to add explicit save semantics for team changes. Players only see teams when admin clicks "Save Teams".

**Database States:** Draft → PoolLocked → TeamsBalanced → Completed (unchanged)  
**UI Steps:** Pool (1) → Teams (2) → Done (3)  
**Key Addition:** `teams_saved_at` timestamp on `upcoming_matches`

---

## Pre-Implementation Checklist ✅ COMPLETE

- [x] Review this plan thoroughly
- [x] Backup database before starting
- [x] Create git branch: `feature/match-control-refactor`
- [x] Ensure all current tests pass
- [x] Notify any other developers

---

## Phase 1: Database Changes ✅ COMPLETE

### 1.1 Add New Column ✅

**SQL executed in Supabase:**
```sql
ALTER TABLE upcoming_matches 
ADD COLUMN teams_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### 1.2 State Values Decision ✅

**Decision:** Keep existing DB states (Draft, PoolLocked, TeamsBalanced, Completed)
- UI maps to 3-step display
- No migration of existing data needed
- Cleaner and safer

### 1.3 Prisma Schema Update ✅

**File:** `prisma/schema.prisma`

```prisma
model upcoming_matches {
  // ... existing fields ...
  teams_saved_at DateTime? @db.Timestamptz(6)
}
```

Ran: `npx prisma generate`

---

## Phase 2: Type Definitions

### 2.1 Update Match State Types

**File:** `src/types/match.types.ts` (or wherever defined)

```typescript
// Old
type MatchState = 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Completed';

// New - keep old values for backward compatibility
type MatchState = 'Draft' | 'PoolLocked' | 'TeamsBalanced' | 'Ready' | 'Completed';

// Helper to normalize states
function normalizeState(state: MatchState): 'Draft' | 'Ready' | 'Completed' {
  if (state === 'PoolLocked' || state === 'TeamsBalanced' || state === 'Ready') {
    return 'Ready';
  }
  return state as 'Draft' | 'Completed';
}
```

### 2.2 Update MatchData Interface

**File:** `src/hooks/useMatchState.hook.ts`

```typescript
interface MatchData {
  // ... existing fields ...
  teamsSavedAt: string | null;  // NEW
}
```

---

## Phase 3: API Routes

### 3.1 Modify Lock Pool API

**File:** `src/app/api/admin/upcoming-matches/[id]/lock-pool/route.ts`

**Changes:**
- Keep existing balance logic
- Ensure `teams_saved_at` remains NULL after lock (draft state)
- Return `teams_saved_at` in response

### 3.2 Create Save Teams API (NEW)

**File:** `src/app/api/admin/upcoming-matches/[id]/save-teams/route.ts`

```typescript
// POST: Save current team assignments as "official"
// - Updates teams_saved_at = NOW()
// - Triggers notifications (future)
// - Returns updated match data
```

**Checklist:**
- [ ] Tenant filtering with `withTenantContext`
- [ ] Admin role check with `requireAdminRole`
- [ ] State version check for concurrency
- [ ] Only allowed in Ready state (PoolLocked || TeamsBalanced)

### 3.3 Modify Confirm Teams API

**File:** `src/app/api/admin/upcoming-matches/[id]/confirm-teams/route.ts`

**Decision:** Remove or repurpose?

**Option A: Remove entirely**
- Delete the file
- Remove from useMatchState actions

**Option B: Repurpose as Save Teams**
- Rename to save-teams
- Change behavior to set teams_saved_at

**Recommendation:** Option B - less disruptive

### 3.4 Update GET Match API

**File:** `src/app/api/admin/upcoming-matches/route.ts`

**Changes:**
- Include `teams_saved_at` in response
- Transform for frontend (camelCase)

### 3.5 Update Player-Facing API

**File:** `src/app/api/player/upcoming-matches/route.ts` (or similar)

**Changes:**
- Check `teams_saved_at` before returning team data
- If NULL, return placeholder message instead of teams

---

## Phase 4: Hooks

### 4.1 Update useMatchState Hook

**File:** `src/hooks/useMatchState.hook.ts`

**Changes:**
```typescript
// Add to MatchData interface
teamsSavedAt: string | null;

// Add to fetchMatchState transform
teamsSavedAt: result.data.teams_saved_at,

// Add new action
saveTeams: createApiAction(`/admin/upcoming-matches/${matchId}/save-teams`, 'POST'),

// Modify or remove confirmTeams based on Phase 3 decision
```

### 4.2 Update useUpcomingMatches Hook (Player)

**File:** `src/hooks/queries/useUpcomingMatches.hook.ts`

**Changes:**
- Include `teams_saved_at` in query/transform

---

## Phase 5: Components - Admin

### 5.1 StepperBar Component

**File:** `src/components/admin/matches/StepperBar.component.tsx`

**Changes:**
- Reduce from 4 steps to 3 steps
- Update step labels: Pool → Teams → Done
- Update current step logic

```typescript
// Old steps
const steps = ['Pool', 'Teams', 'Result', 'Done'];

// New steps  
const steps = ['Pool', 'Teams', 'Done'];

// Update currentStepIndex calculation
```

### 5.2 BalanceTeamsPane Component

**File:** `src/components/admin/matches/BalanceTeamsPane.component.tsx`

**Major changes:**
1. Track "working" vs "saved" state
2. Add unsaved changes indicator
3. Add Save/Discard buttons
4. Update props interface

```typescript
interface BalanceTeamsPaneProps {
  // ... existing ...
  teamsSavedAt: string | null;  // NEW
  onSaveTeams: () => Promise<void>;  // NEW
}

// New state
const [workingPlayers, setWorkingPlayers] = useState(initialPlayers);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Compare working vs saved to detect changes
useEffect(() => {
  const hasChanges = !isEqual(workingPlayers, savedPlayers);
  setHasUnsavedChanges(hasChanges);
}, [workingPlayers, savedPlayers]);
```

### 5.3 Match Control Page

**File:** `src/app/admin/matches/[id]/page.tsx`

**Changes:**
1. Update step calculation for 3 steps
2. Pass `teamsSavedAt` to BalanceTeamsPane
3. Add `saveTeams` action
4. Update button labels based on saved state
5. Add navigation guards for unsaved changes

```typescript
// Update primary action logic
case 'PoolLocked':
case 'TeamsBalanced':
  step = 'Teams';
  const isSaved = matchData.teamsSavedAt !== null;
  const hasUnsaved = /* from BalanceTeamsPane */;
  
  if (!isSaved) {
    label = 'Save Teams';
    action = () => actions.saveTeams();
  } else if (hasUnsaved) {
    label = 'Save Changes';
    action = () => actions.saveTeams();
  } else {
    label = 'Enter Result';
    action = () => /* navigate to result entry */;
  }
  break;
```

### 5.4 GlobalCtaBar Component

**File:** `src/components/admin/matches/GlobalCtaBar.component.tsx`

**Changes:**
- May need to support secondary action (Discard)
- Or add Discard as separate button in BalanceTeamsPane

---

## Phase 6: Components - Player

### 6.1 UpcomingMatchCard Component

**File:** `src/components/upcoming/UpcomingMatchCard.component.tsx`

**Changes:**
```typescript
// Update renderExpandedContent
const renderExpandedContent = () => {
  // Check if teams are saved
  if (!expandedMatch.teams_saved_at) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-slate-500">Teams being finalized...</p>
      </div>
    );
  }
  
  // Show actual teams
  return hasTeamAssignments ? renderTeams() : renderPlayerPool();
};
```

### 6.2 Player Upcoming Page

**File:** `src/app/player/upcoming/page.tsx`

**Changes:**
- Likely minimal - just passes data to UpcomingMatchCard

---

## Phase 7: State Display Updates

### 7.1 Update formatStateDisplay (Multiple Files)

**Files:**
- `src/app/admin/matches/[id]/page.tsx`
- `src/components/upcoming/UpcomingMatchCard.component.tsx`

**Already done in previous session - verify consistent**

---

## Phase 8: Navigation Guards

### 8.1 Add Unsaved Changes Warning

**File:** `src/app/admin/matches/[id]/page.tsx`

```typescript
// Warn on browser back/refresh with unsaved changes
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### 8.2 Unlock Pool with Unsaved Changes

**File:** `src/app/admin/matches/[id]/page.tsx`

```typescript
// Before unlocking, check for unsaved changes
const handleUnlockPool = async () => {
  if (hasUnsavedChanges) {
    const confirmed = await showConfirmation(
      "Discard unsaved changes?",
      "Your team modifications will be lost."
    );
    if (!confirmed) return;
  }
  await actions.unlockPool();
};
```

---

## Phase 9: Documentation Updates

### 9.1 Update Main Spec

**File:** `docs/SPEC_match-control-centre.md`

- Update state machine section
- Update flow descriptions
- Reference MERMAID document
- Mark old states as deprecated

### 9.2 Update Code Generation Rules

**File:** `.cursor/rules/code-generation.mdc`

- Update any match state references

---

## Testing Plan ✅ COMPLETE

### Manual Testing Completed

**Pool Screen (Step 1):**
- [x] Can add/remove players
- [x] Lock & Balance modal with all methods
- [x] Ability disabled for uneven/4v4 teams
- [x] Correct validation for pool sizes (8-22)
- [x] Compact stepper shows step 1 active

**Teams Screen - Set Teams (Step 2):**
- [x] Shows balanced teams immediately after Lock & Balance
- [x] `teams_saved_at` is NULL initially (Status: ARRANGING)
- [x] Player view shows "Teams being finalised..."
- [x] "Save Teams" CTA visible
- [x] Clicking Save sets `teams_saved_at` with green flash
- [x] CTA changes to "Enter Result" after save
- [x] Player view now shows teams (Status: TEAMS SET)

**Teams Screen - Modifications:**
- [x] Can drag players between teams
- [x] Discard button appears (purple-pink gradient)
- [x] Copy button hidden when unsaved changes
- [x] Re-Balance creates new unsaved state
- [x] Save Changes updates DB
- [x] Discard resets to last saved state
- [x] Tornado charts show for Ability/Performance only

**Result Entry (Step 3):**
- [x] Score bar at top with tap-to-toggle teams
- [x] Compact player rows
- [x] No-show toggle works
- [x] Uneven team warning when no-shows create imbalance
- [x] Team swap arrows work
- [x] Goal +/- buttons with gradient
- [x] Save Result completes match

**Player View:**
- [x] Draft match → Status: BUILDING
- [x] PoolLocked, unsaved → "Teams being finalised..."
- [x] PoolLocked, saved → Full team lists
- [x] Completed → Teams + Result

---

## Rollback Plan

If something goes wrong:

1. **Revert git branch** - Don't merge to main until fully tested
2. **DB rollback** - Run rollback SQL from Phase 1
3. **Prisma regenerate** - Remove new field, regenerate

---

## Implementation Order ✅ ALL COMPLETE

1. ✅ **Phase 1** - DB changes (`teams_saved_at` column added)
2. ✅ **Phase 2** - Types (Prisma schema, interface updates)
3. ✅ **Phase 3** - APIs (`save-teams` endpoint, `lock-pool` with balance method)
4. ✅ **Phase 4** - Hooks (`useMatchState` updated with `teamsSavedAt` and `saveTeams`)
5. ✅ **Phase 5** - BalanceTeamsPane (local state tracking, Save/Discard/Copy buttons)
6. ✅ **Phase 6** - Match Control page (3 steps, green save flash, status badges)
7. ✅ **Phase 7** - StepperBar (3 steps, neutral grey styling)
8. ✅ **Phase 8** - Player view (`teams_saved_at` check, "Teams being finalised...")
9. ✅ **Phase 9** - CompleteMatchForm (tap-to-toggle, no-show handling, uneven warnings)
10. ✅ **Phase 10** - Documentation (SPEC, MERMAID, PLAN all updated)

---

## Effort Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Database | ✅ | Added `teams_saved_at` column |
| 2. Types | ✅ | Prisma + TypeScript interfaces |
| 3. APIs | ✅ | `save-teams`, modified `lock-pool` |
| 4. Hooks | ✅ | `useMatchState` with save action |
| 5-6. Admin UI | ✅ | BalanceTeamsPane, page orchestration |
| 7. Stepper | ✅ | 3-step, neutral grey styling |
| 8. Player view | ✅ | Visibility gated on `teams_saved_at` |
| 9. Result entry | ✅ | Tap-to-toggle, no-show warnings |
| 10. Docs | ✅ | SPEC, MERMAID, PLAN updated |

**Total implementation time:** ~1 day iterative development

---

## Open Questions - RESOLVED

1. **Do we rename DB states?** ✅ No - kept existing states, UI maps to 3 steps
2. **What about existing matches in PoolLocked/TeamsBalanced?** ✅ No migration needed - existing matches work unchanged
3. **Should Re-Balance auto-save or stay as draft?** ✅ Draft (unsaved) - maintains explicit save model
4. **Notifications scope?** ✅ Deferred to RSVP implementation

---

## Sign-Off ✅

- [x] Plan reviewed and approved
- [x] All questions resolved
- [x] Implementation complete
- [x] Documentation updated

---

**Implementation complete: December 2, 2025**

