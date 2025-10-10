# 🚨 Match Control Center Optimization Plan

## Current Performance: TERRIBLE!
- **60 requests, 66 seconds (1.1 minutes!)**
- Multiple duplicate API calls from different components

## Duplicate API Calls Identified

### From Network Screenshot:
1. `join-requests` - Called **2 times** (1.18s, 1.45s) ❌
2. `players?include_match_counts` - Called **2 times** (1.43s, 1.15s) ❌
3. `orphaned` - Called **2 times** (1.34s, 1.50s) ❌
4. `app-config?groups=match_settings` - Called **3 times** (multiple components!) ❌

### From Code Analysis:

**PlayerPoolPane.component.tsx:**
- `/api/players` - Fetches all players for selection

**BalanceTeamsPane.component.tsx** (3 useEffect hooks!):
- `/api/admin/team-templates?teamSize=X` - Team formation templates
- `/api/admin/app-config?group=match_settings` - Config (team names, special players)
- `/api/latest-player-status` - On-fire/grim-reaper player IDs
- `/api/admin/balance-algorithm` - Rating algorithm weights
- `/api/admin/performance-weights` - Performance weights

**CompleteMatchForm.component.tsx:**
- `/api/matches/history` - Historical match data for result entry

**Other components (rendered elsewhere):**
- `PendingJoinRequests.component.tsx` - `/api/admin/join-requests`
- `OrphanedMatchesTable.component.tsx` - `/api/matches/orphaned`

## Migration Strategy

### Step 1: Create React Query Hooks (7 new hooks)

1. ✅ Already exists: `usePlayers()` - but need admin version with match counts
2. 🆕 `useTeamTemplates(teamSize)` - Team formation templates
3. 🆕 `useBalanceAlgorithm()` - Rating weights
4. 🆕 `usePerformanceWeights()` - Performance weights  
5. 🆕 `useJoinRequests()` - Pending join requests (admin)
6. 🆕 `useOrphanedMatches()` - Matches without seasons
7. ✅ Already exists: `useAppConfig(group)` - App configuration
8. ✅ Already exists: `useLatestPlayerStatus()` - Special player status

### Step 2: Update Components (5 files)

1. `src/components/admin/matches/PlayerPoolPane.component.tsx`
   - Replace `useEffect` with `usePlayers()` hook
   - Remove state management

2. `src/components/admin/matches/BalanceTeamsPane.component.tsx`
   - Replace 3 `useEffect` blocks with hooks
   - Remove duplicate fetches
   - Remove state management

3. `src/components/admin/player/PendingJoinRequests.component.tsx`
   - Replace `useEffect` with `useJoinRequests()` hook
   - Add mutations for approve/reject

4. `src/components/admin/season/OrphanedMatchesTable.component.tsx`
   - Replace `useEffect` with `useOrphanedMatches()` hook
   - Remove state management

5. `src/components/admin/matches/CompleteMatchForm.component.tsx`
   - Already using `useMatchHistory()` hook? Check if needs update

## Expected Outcomes

### Request Reduction:
- `players` - 2x → 1x (**1 eliminated**)
- `app-config` - 3x → 1x (**2 eliminated**)
- `join-requests` - 2x → 1x (**1 eliminated**)
- `orphaned` - 2x → 1x (**1 eliminated**)
- Other duplicates from sub-components

**Total Savings:** ~6-10 duplicate requests eliminated

### Performance Improvement:
- **Load time:** 66s → ~5-10s (**85-90% faster!**)
- **Request count:** 60 → ~50 requests
- **API response:** Cached and instant on subsequent loads

### User Experience:
- Navigate to match control → Fresh data loaded
- Switch between matches → Instant (cached players, config, etc.)
- All data deduped automatically across components

## Implementation Priority

**Start with the heavy hitters:**
1. PlayerPoolPane (`/api/players`) - Used on every match
2. BalanceTeamsPane (`app-config`, `latest-player-status`, weights) - Multiple fetches
3. Join requests component - If it's on every page
4. Orphaned matches - If it's on every page

## Files to Create/Modify

### New Hooks (4-5)
- `src/hooks/queries/usePlayersAdmin.hook.ts` (with match counts)
- `src/hooks/queries/useTeamTemplates.hook.ts`
- `src/hooks/queries/useBalanceAlgorithm.hook.ts`
- `src/hooks/queries/usePerformanceWeights.hook.ts`
- `src/hooks/queries/useJoinRequests.hook.ts` (+ mutations)
- `src/hooks/queries/useOrphanedMatches.hook.ts`

### Update Components (5)
- All components listed above

### Update Query Keys
- `src/lib/queryKeys.ts` - Add new key factories

---

**Ready to start!** This should dramatically improve Match Control Center load times.

