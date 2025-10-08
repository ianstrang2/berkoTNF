# Phase 2 Route Update Progress

**Date:** 2025-01-08  
**Total Routes:** 48  
**Pattern:** Remove manual `getTenantFromRequest` + `$executeRaw`, use `withTenantContext` wrapper

---

## ✅ Completed (7/48)

### High-Priority Routes
1. ✅ `/api/players` - Player list (GET)
2. ✅ `/api/matchReport` - Match report (GET)
3. ✅ `/api/admin/players` - Admin player management (GET, POST, PUT)
4. ✅ `/api/upcoming` - Upcoming matches (GET)
5. ✅ `/api/allTimeStats` - All-time stats (GET)
6. ✅ `/api/honourroll` - Honour roll (GET)
7. ✅ `/api/seasons` - Seasons list (GET, POST)

---

## 🔄 In Progress - Batch Update Remaining Routes

### Stats Routes (5 routes)
- [x] `/api/allTimeStats` ✅
- [x] `/api/honourroll` ✅
- [ ] `/api/stats/league-averages`
- [ ] `/api/stats/half-season`
- [ ] `/api/stats/route.ts`

### Season Routes (4 routes)
- [x] `/api/seasons/route.ts` ✅
- [ ] `/api/seasons/current`
- [ ] `/api/seasons/[id]`
- [ ] `/api/seasons/validate-match`

### Match Routes (2 routes)
- [ ] `/api/matches/history`
- [ ] `/api/matches/orphaned`

### Player Routes (3 routes)
- [ ] `/api/playerprofile`
- [ ] `/api/personal-bests`
- [ ] `/api/latest-player-status`

### Admin Config Routes (8 routes)
- [ ] `/api/admin/app-config`
- [ ] `/api/admin/performance-weights`
- [ ] `/api/admin/performance-settings`
- [ ] `/api/admin/team-templates`
- [ ] `/api/admin/team-templates/reset`
- [ ] `/api/admin/team-slots`
- [ ] `/api/admin/team-slots/create-match`
- [ ] `/api/admin/match-report-health`

### Balance & Team Generation (6 routes)
- [ ] `/api/admin/balance-algorithm`
- [ ] `/api/admin/balance-algorithm/reset`
- [ ] `/api/admin/balance-teams`
- [ ] `/api/admin/generate-teams`
- [ ] `/api/admin/balance-by-past-performance`
- [ ] `/api/admin/random-balance-match`

### Match Management (11 routes)
- [ ] `/api/admin/upcoming-matches`
- [ ] `/api/admin/upcoming-matches/[id]/complete`
- [ ] `/api/admin/upcoming-matches/[id]/confirm-teams`
- [ ] `/api/admin/upcoming-matches/[id]/lock-pool`
- [ ] `/api/admin/upcoming-matches/[id]/unlock-pool`
- [ ] `/api/admin/upcoming-matches/[id]/unlock-teams`
- [ ] `/api/admin/upcoming-matches/[id]/undo`
- [ ] `/api/admin/upcoming-match-players`
- [ ] `/api/admin/upcoming-match-players/swap`
- [ ] `/api/admin/match-player-pool`
- [ ] `/api/admin/create-match-from-planned`

### Background Jobs (3 routes)
- [ ] `/api/admin/background-jobs`
- [ ] `/api/admin/enqueue-stats-job`
- [ ] `/api/admin/trigger-stats-update`

### Other (3 routes)
- [ ] `/api/admin/player-profile-metadata`
- [ ] `/api/season-race-data`

---

## ⏭️ Skip These (Already Correct)

### Auth Routes (Service Role Pattern)
- ✅ `/api/auth/link-by-phone` - Uses service role for cross-tenant lookup
- ✅ `/api/auth/profile` - Uses service role for cross-tenant lookup

### Public Routes (No Auth Required)
- ✅ `/api/join/validate-token` - Public route
- ✅ `/api/join/by-code` - Public route

---

## 📊 Progress

**Updated:** 4/48 (8%)  
**Remaining:** 44 routes  
**Estimated Time:** 2-3 hours (at 3-4 min per route)

---

## 🚀 Strategy

### Option 1: Update All (Recommended Before Production)
- Update all 48 routes systematically
- Test thoroughly with both tenants
- Production-ready Phase 2 implementation

### Option 2: Update Critical Path Only
- Keep the 4 high-priority routes done
- Update others as needed
- Lower risk, slower migration

### Option 3: Gradual Migration
- Update 5-10 routes per day
- Test continuously
- Safer, more controlled

---

## ✅ Testing After Each Batch

After updating each batch:
1. Restart dev server
2. Test the updated routes
3. Check middleware logs
4. Verify tenant isolation
5. Move to next batch

---

**Status:** 4/48 complete  
**Next:** Continue with remaining routes or proceed to Phase 3 testing

