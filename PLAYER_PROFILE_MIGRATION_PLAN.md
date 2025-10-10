# 🚀 Player Profile Optimization Plan

## Current Performance (SLOW!)
- **59 requests, 96 seconds (1.6 minutes!)**
- Multiple duplicate API calls

## API Calls Identified

### From Network Screenshot:
1. `playerprofile?id=29` - Called **4 times** (1.11s, 1.51s, 1.35s each) ❌
2. `league-averages` - Called **2 times** (1.10s, 1.41s) ❌
3. `29` (player trends) - Called **2 times** (1.51s, 2.24s) ❌  
4. `allmatches` - Called **2 times** (1.50s, 1.61s) ❌

### From Code Analysis:
1. `/api/playerprofile?id=${id}` - Main profile data
2. `/api/stats/league-averages` - League averages for normalization
3. `/api/player/trends/${id}` - EWMA trend data
4. `/api/player/${playerId}/allmatches` - Full match history

## Components Involved

### 1. PlayerProfile.component.tsx
- Main component
- Fetches: playerprofile, league-averages, trends
- Has 3 `useEffect` hooks (will convert to React Query)

### 2. MatchPerformance.component.tsx  
- Sub-component (rendered by PlayerProfile)
- Fetches: allmatches
- Has 1 `useEffect` hook

## Migration Strategy

### Step 1: Create React Query Hooks (4 new hooks)

1. ✅ `useLeagueAverages()` - **Already exists!**
2. 🆕 `usePlayerProfile(playerId)` - Profile data
3. 🆕 `usePlayerTrends(playerId)` - Trend/percentile data
4. 🆕 `usePlayerMatches(playerId)` - All match history

### Step 2: Update Components (2 files)

1. `src/components/player/PlayerProfile.component.tsx`
   - Replace 3 `useEffect` blocks with React Query hooks
   - Remove state management (loading, error, data)
   - Use hook data directly

2. `src/components/player/MatchPerformance.component.tsx`
   - Replace `useEffect` with `usePlayerMatches()` hook
   - Remove state management
   - Use hook data directly

## Expected Outcomes

### Request Reduction
- `playerprofile` - 4x → 1x (**3 eliminated**)
- `league-averages` - 2x → 1x (**1 eliminated**)
- `trends` - 2x → 1x (**1 eliminated**)
- `allmatches` - 2x → 1x (**1 eliminated**)

**Total Savings:** ~6-8 duplicate requests eliminated

### Performance Improvement
- **Load time:** 96s → ~3-5s (**95% faster!**)
- **Request count:** 59 → ~50 requests
- **API response:** Cached and instant on subsequent loads

### User Experience
- Navigate to profile → Fresh data loaded
- Navigate away → Data cached
- Return to profile → **Instant load** (from cache)
- All data deduped automatically

## Files to Create/Modify

### New Hooks (3)
- `src/hooks/queries/usePlayerProfile.hook.ts`
- `src/hooks/queries/usePlayerTrends.hook.ts`
- `src/hooks/queries/usePlayerMatches.hook.ts`

### Update Components (2)
- `src/components/player/PlayerProfile.component.tsx`
- `src/components/player/MatchPerformance.component.tsx`

### Update Query Keys
- `src/lib/queryKeys.ts` - Add new key factories

## Implementation Order

1. Create 3 new React Query hooks
2. Update queryKeys.ts
3. Update PlayerProfile.component.tsx
4. Update MatchPerformance.component.tsx
5. Test thoroughly

---

**Ready to start!** This should dramatically improve player profile load times.

