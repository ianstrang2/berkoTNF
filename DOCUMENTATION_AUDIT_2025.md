# 📚 Documentation Audit - October 10, 2025

**Total Files Found:** 75 markdown files  
**Purpose:** Clean up documentation, update current status, organize for maintainability

---

## 🟢 KEEP (20 files) - Core Specs & Active Docs

### **Specifications (Core Product Features)**

#### `docs/SPEC_*.md` Files (11 files) - **KEEP ALL**
1. **`docs/SPEC_auth.md`** - Authentication specification (Phase 6 complete)
2. **`docs/SPEC_multi_tenancy.md`** - Multi-tenant architecture
3. **`docs/SPEC_match-control-centre.md`** - Match Control Center (complete implementation)
4. **`docs/SPEC_match-report.md`** - Dashboard match report
5. **`docs/SPEC_background_jobs.md`** - Background job system
6. **`docs/SPEC_balance_by_rating_algorithm.md`** - Ability-based balancing
7. **`docs/SPEC_balance_by_performance_algorithm.md`** - Performance-based balancing
8. **`docs/SPEC_performance_rating_system.md`** - Power rating system
9. **`docs/SPEC_LLM-player-profile.md`** - AI profile generation
10. **`docs/SPEC_RSVP.md`** - Player availability system (future)
**Reason:** These are permanent product specifications. Essential reference documentation.

**NOTE:** Uneven teams feature is documented in `docs/SPEC_match-control-centre.md` Section 10, not as standalone spec.

---

### **Future Planning & Known Issues**

12. **`docs/FUTURE_PROBLEMS.md`** - **KEEP** ✅
    - Tracks known technical debt and scaling challenges
    - Payment timing, regulatory compliance, performance optimization
    - Active reference for prioritization

13. **`docs/Billing_Plan.md`** - **KEEP** ✅
    - Future feature specification
    - Payment system architecture

14. **`docs/marketing_spec.md`** - **KEEP** ✅
    - Marketing features specification
    - Future planning

15. **`docs/PLAN_marketing_sandbox_guides.md`** - **KEEP** ✅
    - Implementation plan
    - Future feature

---

### **Current Implementation Status**

16. **`CURRENT_STATUS.md`** - **KEEP & UPDATE** ⚠️
    - Last updated: October 9, 2025
    - **ACTION NEEDED:** Update with RLS refactor completion (October 10)
    - Add: React Query optimization complete, Performance improvements
    - This is your "single source of truth" status doc

17. **`FIND_MISSING_TRY_BLOCKS.md`** - **KEEP** ✅ (Just created today)
    - Search pattern guide for finding syntax errors
    - Useful debugging tool

18. **`.cursor/rules/code-generation.mdc`** - **KEEP** ✅ (Not in audit but critical)
    - Coding standards (already updated with RLS patterns)
    - Active development guide

---

### **Implementation Guides (Working Features)**

19. **`README-UNEVEN-TEAMS.md`** - **DELETE** ❌
    - Brief implementation summary
    - **Reason:** All info already in `docs/SPEC_match-control-centre.md` Section 10

20. **`docs/fixing-heavy-wins.md`** - **KEEP** ✅
    - Implementation guide for configurable heavy win threshold
    - Active feature documentation

---

## 🟡 MERGE (15 files) - Info Should Be Consolidated

### **Session Handoffs → Merge into CURRENT_STATUS.md**

21. **`SESSION_COMPLETE_RLS_FIX.md`** - **MERGE** 📝
    - Session summary from RLS refactor (October 10)
    - **Merge into:** `CURRENT_STATUS.md` (add RLS refactor section)
    - **Reason:** Completion status should be in main status doc

22. **`RLS_REFACTOR_COMPLETE.md`** - **MERGE** 📝
    - Technical details of RLS refactor
    - **Merge into:** `docs/SPEC_multi_tenancy.md` (add RLS architecture section)
    - **Reason:** Architecture decision should be in spec

23. **`QUICK_START_TESTING.md`** - **MERGE** 📝
    - Testing guide for RLS fix
    - **Merge into:** `CURRENT_STATUS.md` or delete (testing complete)
    - **Reason:** One-time testing guide, no longer needed

24. **`TENANT_SWITCHING_FIX.md`** - **MERGE** 📝
    - Fix documentation for tenant switching
    - **Merge into:** `docs/SPEC_multi_tenancy.md`
    - **Reason:** Part of multi-tenancy architecture

25. **`HANDOFF_REACT_QUERY_CONTINUATION.md`** - **MERGE** 📝
    - React Query migration handoff
    - **Merge key findings into:** `CURRENT_STATUS.md` (React Query section)
    - **Reason:** Migration complete, extract learnings

26. **`HANDOFF_RLS_ISSUE.md`** - **MERGE** 📝
    - RLS issue handoff
    - **Merge into:** `docs/SPEC_multi_tenancy.md`
    - **Reason:** Part of RLS story

27. **`HANDOFF_TO_NEW_CONTEXT.md`** - **MERGE** 📝
    - Context window handoff
    - **Extract key status into:** `CURRENT_STATUS.md`
    - **Reason:** Historical handoff, extract current state only

---

### **Migration Summaries → Keep Brief Notes, Delete Details**

28. **`MATCH_CONTROL_CENTER_MIGRATION_PLAN.md`** - **MERGE** 📝
    - Migration plan (complete)
    - **Merge into:** `docs/SPEC_match-control-centre.md` (add "Migration Complete" section)
    - **Reason:** Spec should note feature is live

29. **`MATCH_CONTROL_CENTER_COMPLETE.md`** - **MERGE** 📝
    - Completion summary
    - **Merge into:** `docs/SPEC_match-control-centre.md`
    - **Reason:** Status update for spec

30. **`PLAYER_PROFILE_MIGRATION_PLAN.md`** - **MERGE** 📝
    - Player profile migration plan
    - **Merge key outcomes into:** `docs/SPEC_LLM-player-profile.md`

31. **`PLAYER_PROFILE_MIGRATION_COMPLETE.md`** - **MERGE** 📝
    - Completion status
    - **Merge into:** `docs/SPEC_LLM-player-profile.md`

32. **`REACT_QUERY_MIGRATION_COMPLETE.md`** - **MERGE** 📝
    - React Query migration completion
    - **Merge performance metrics into:** `CURRENT_STATUS.md`
    - **Reason:** Extract metrics, delete implementation details

---

### **Performance Investigation → Keep Metrics Only**

33. **`PERFORMANCE_INVESTIGATION.md`** - **MERGE** 📝
    - Performance investigation findings
    - **Merge key metrics into:** `CURRENT_STATUS.md` (Performance section)
    - **Reason:** Extract results, delete investigation process

34. **`PERFORMANCE_FIXES_APPLIED.md`** - **MERGE** 📝
    - Applied fixes summary
    - **Merge into:** `CURRENT_STATUS.md`

35. **`FINAL_PERFORMANCE_SUMMARY.md`** - **MERGE** 📝
    - Final performance results
    - **Merge into:** `CURRENT_STATUS.md`

---

## 🔴 DELETE (42 files) - Obsolete Session Handoffs

### **Old Session Handoffs (Completed Work)**

36. **`NEW_WINDOW_STARTUP_PROMPT.md`** - **DELETE** ❌
    - Session handoff from previous context window
    - **Reason:** Work complete (RLS fixed, performance optimized)

37. **`NEW_WINDOW_PROMPT_RLS.md`** - **DELETE** ❌
    - RLS handoff prompt
    - **Reason:** RLS refactor complete

38. **`NEW_WINDOW_PROMPT.md`** - **DELETE** ❌
    - Old session prompt
    - **Reason:** Superseded by newer handoffs

39. **`NEW_WINDOW_SUMMARY.md`** - **DELETE** ❌
    - Old session summary
    - **Reason:** Superseded

40. **`SESSION_HANDOFF_NEXT_WINDOW.md`** - **DELETE** ❌
    - Old session handoff
    - **Reason:** Work complete

41. **`SESSION_COMPLETE_SUMMARY.md`** - **DELETE** ❌
    - Old session complete summary
    - **Reason:** Superseded by newer docs

42. **`COMPLETE_SESSION_SUMMARY.md`** - **DELETE** ❌
    - Another session summary
    - **Reason:** Duplicate/superseded

---

### **Completed Migrations (Extract to Spec, Delete Details)**

43. **`ADMIN_MATCHES_MIGRATION_COMPLETE.md`** - **DELETE** ❌
    - Admin matches migration complete
    - **Reason:** Feature complete, details in SPEC_match-control-centre.md

44. **`DASHBOARD_MIGRATION_SUCCESS.md`** - **DELETE** ❌
    - Dashboard migration success
    - **Reason:** Feature complete, details in SPEC_match-report.md

45. **`RECORDS_MIGRATION_COMPLETE.md`** - **DELETE** ❌
    - Records migration complete
    - **Reason:** Migration complete, feature is live

46. **`TABLE_MIGRATION_COMPLETE.md`** - **DELETE** ❌
    - Table migration complete
    - **Reason:** Migration complete

47. **`UPCOMING_MATCHES_MIGRATION_COMPLETE.md`** - **DELETE** ❌
    - Upcoming matches migration complete
    - **Reason:** Feature complete, part of match control spec

48. **`TEST_RECORDS_MIGRATION.md`** - **DELETE** ❌
    - Testing guide for records migration
    - **Reason:** Testing complete

49. **`TEST_UPCOMING_MIGRATION.md`** - **DELETE** ❌
    - Testing guide for upcoming migration
    - **Reason:** Testing complete

50. **`TEST_AUTH_LOADING_GATE.md`** - **DELETE** ❌
    - Auth testing guide
    - **Reason:** Testing complete

51. **`TESTING_DASHBOARD.md`** - **DELETE** ❌
    - Dashboard testing guide
    - **Reason:** Testing complete, feature is live

---

### **Completed Fixes (Obsolete After RLS Refactor)**

52. **`RLS_FIX_COMPLETE.md`** - **DELETE** ❌
    - Old RLS fix documentation
    - **Reason:** Superseded by RLS_REFACTOR_COMPLETE.md

53. **`RLS_FIX_COMPLETION_STATUS.md`** - **DELETE** ❌
    - Old RLS completion status
    - **Reason:** Superseded

54. **`RLS_FIX_FINAL_SUMMARY.md`** - **DELETE** ❌
    - Old RLS final summary
    - **Reason:** Superseded by refactor docs

55. **`TENANT_FIX_PLAN.md`** - **DELETE** ❌
    - Old tenant fix plan
    - **Reason:** Completed, superseded

56. **`TENANT_ISOLATION_FIX_COMPLETE.md`** - **DELETE** ❌
    - Tenant isolation fix complete
    - **Reason:** Part of RLS refactor, now complete

57. **`FIX_MIDDLEWARE_TRANSACTION_SCOPED.md`** - **DELETE** ❌
    - Middleware fix documentation
    - **Reason:** Fix applied, obsolete

58. **`CRITICAL_FIX_HTTP_CACHE.md`** - **DELETE** ❌
    - HTTP cache fix
    - **Reason:** Fix applied, documented in coding standards

59. **`AUTH_LOADING_GATE_FIX.md`** - **DELETE** ❌
    - Auth loading gate fix
    - **Reason:** Fix applied, feature working

60. **`READY_TO_TEST_AUTH_FIX.md`** - **DELETE** ❌
    - Auth testing prompt
    - **Reason:** Testing complete

61. **`NAVIGATION_BUG_FIXED.md`** - **DELETE** ❌
    - Navigation bug fix
    - **Reason:** Bug fixed, obsolete

62. **`PHASE2_MISSED_ROUTES_FIXED.md`** - **DELETE** ❌
    - Phase 2 route fixes
    - **Reason:** Fixes applied, documented in coding standards

63. **`OPTIONAL_CLEANUP_LOADING_GATES.md`** - **DELETE** ❌
    - Optional cleanup guide
    - **Reason:** Cleanup complete or not needed

---

### **Old Refactor Plans (Implemented or Obsolete)**

64. **`docs/refactor-player-profile-split.md`** - **DELETE** ❌
    - Player profile refactor plan
    - **Reason:** Refactor complete or superseded

65. **`docs/route-cleanup.md`** - **DELETE** ❌
    - Route cleanup plan
    - **Reason:** Cleanup complete

66. **`docs/REACT_QUERY_MIGRATION.md`** - **DELETE** ❌
    - React Query migration plan
    - **Reason:** Migration complete, superseded by REACT_QUERY_MIGRATION_COMPLETE.md

67. **`docs/RLS_IMPLEMENTATION_COMPLETE_SUMMARY.md`** - **DELETE** ❌
    - Old RLS summary (duplicates newer docs)
    - **Reason:** Superseded by RLS_REFACTOR_COMPLETE.md

68. **`docs/ENV_CONFIGURATION_PHASE1.md`** - **DELETE** ❌
    - Environment config phase 1
    - **Reason:** Phase 1 complete, details obsolete

69. **`docs/SPEC_in_out_functionality_plan.md`** - **DELETE or UPDATE** ⚠️
    - In/Out functionality plan
    - **Reason:** If implemented, merge into spec. If not, keep as future plan.
    - **ACTION NEEDED:** Check if feature is implemented

70. **`docs/SPEC_uneven-teams.md`** - **DELETE** ❌
    - Standalone uneven teams spec (1,861 lines)
    - **Reason:** All essential info in `docs/SPEC_match-control-centre.md` Section 10
    - This is historical implementation notes, superseded by integrated spec

---

### **Duplicate Investigation Files**

70. **`UNDERSTANDING_REQUEST_COUNTS.md`** - **DELETE** ❌
    - Request count investigation
    - **Reason:** Investigation complete, React Query fixes applied

71. **`fix-own-goals.md`** - **MERGE** 📝
    - Own goals fix documentation (root level)
    - **Merge into:** `docs/SPEC_match-control-centre.md` (Section 11.3 already has this)
    - **Reason:** Duplicate location, spec already documents it

72. **`docs/fixing-heavy-wins.md`** - **KEEP** ✅
    - Heavy wins implementation guide
    - **Reason:** Active feature with detailed implementation notes

---

### **Final Status Reports (Historical)**

73. **`FINAL_STATUS_REPORT.md`** - **DELETE** ❌
    - Old final status
    - **Reason:** Superseded by CURRENT_STATUS.md

74. **`docs/SPEC_season_refactor`** - **CHECK** ⚠️
    - Directory or file?
    - **ACTION NEEDED:** Check if this is implemented or future

75. **`backup/AUTH_CURRENT_STATUS.md`** - **DELETE** ❌
    - Backup auth status
    - **Reason:** Backup folder, obsolete

---

## 📊 Summary Counts

| Category | Count | Action |
|----------|-------|--------|
| **KEEP** | 18 | Essential specs and current docs |
| **MERGE** | 15 | Consolidate into specs/status |
| **DELETE** | 42 | Obsolete session handoffs and completed work |

---

## 🎯 Recommended Actions

### **Phase 1: Update Current Status** (5 minutes)

**File:** `CURRENT_STATUS.md`

**Add sections:**
```markdown
### 5. Performance Optimization ✅ **COMPLETE** (October 10, 2025)
- React Query migration: 28 hooks created
- 85% average performance improvement (10-15s → 1-3s)
- Eliminated 300+ duplicate API requests
- All screens under 6 seconds
- **Metrics:** See performance table below

### 6. RLS Refactor ✅ **COMPLETE** (October 10, 2025)
- Disabled RLS on operational tables (13 tables)
- Type-safe `withTenantFilter()` helper enforces tenant isolation
- Fixed connection pooling race conditions
- Tenant switching now 100% reliable
- **Architecture:** See .cursor/rules/code-generation.mdc

### 7. Match Control Center ✅ **COMPLETE** (January 2025)
- Full lifecycle management (Draft → PoolLocked → TeamsBalanced → Completed)
- 96% performance improvement (66s → 2-6s)
- Advanced balancing algorithms (Ability, Performance, Random)
- **Spec:** docs/SPEC_match-control-centre.md
```

---

### **Phase 2: Merge Key Info into Specs** (30 minutes)

#### **Into `docs/SPEC_multi_tenancy.md`:**
- Merge: `RLS_REFACTOR_COMPLETE.md` (Architecture decision section)
- Merge: `TENANT_SWITCHING_FIX.md` (Superadmin switching implementation)
- Add: "RLS + Connection Pooling Issue" section with solution

#### **Into `docs/SPEC_match-control-centre.md`:**
- Merge: `MATCH_CONTROL_CENTER_COMPLETE.md` (Implementation completion notes)
- Note: Own goals fix already documented (Section 11.3)

#### **Into `docs/SPEC_auth.md`:**
- Review Phase 6 status (you mentioned testing Phase 6 before getting sidetracked)
- Add any missing Phase 6 completion notes

---

### **Phase 3: Delete Obsolete Files** (5 minutes)

**Safe to delete immediately (40 files):**

```bash
# Session handoffs (work complete)
rm NEW_WINDOW_*.md
rm SESSION_*.md
rm HANDOFF_*.md
rm COMPLETE_SESSION_SUMMARY.md

# Completed migrations (details in specs)
rm *_MIGRATION_COMPLETE.md
rm *_MIGRATION_PLAN.md
rm TEST_*.md
rm TESTING_DASHBOARD.md

# Completed fixes (applied)
rm RLS_FIX_*.md  # Keep RLS_REFACTOR_COMPLETE.md temporarily
rm TENANT_FIX_PLAN.md
rm TENANT_ISOLATION_FIX_COMPLETE.md
rm FIX_MIDDLEWARE_*.md
rm CRITICAL_FIX_HTTP_CACHE.md
rm AUTH_LOADING_GATE_FIX.md
rm READY_TO_TEST_AUTH_FIX.md
rm NAVIGATION_BUG_FIXED.md
rm PHASE2_MISSED_ROUTES_FIXED.md
rm OPTIONAL_CLEANUP_LOADING_GATES.md

# Investigations (results applied)
rm PERFORMANCE_INVESTIGATION.md
rm PERFORMANCE_FIXES_APPLIED.md
rm FINAL_PERFORMANCE_SUMMARY.md
rm UNDERSTANDING_REQUEST_COUNTS.md

# Duplicates/superseded
rm FINAL_STATUS_REPORT.md
rm fix-own-goals.md  # Duplicate of spec section
rm README-UNEVEN-TEAMS.md  # Duplicate of match-control-centre.md Section 10
rm docs/SPEC_uneven-teams.md  # Superseded by match-control-centre.md Section 10
rm docs/REACT_QUERY_MIGRATION.md  # Superseded by _COMPLETE
rm docs/RLS_IMPLEMENTATION_COMPLETE_SUMMARY.md  # Superseded
rm docs/ENV_CONFIGURATION_PHASE1.md  # Phase 1 complete
rm docs/route-cleanup.md  # Cleanup complete
rm docs/refactor-player-profile-split.md  # Refactor complete
rm backup/AUTH_CURRENT_STATUS.md  # Backup
```

---

## 📋 Clean Final Structure (20 Files)

### **Root Level (2 files):**
```
CURRENT_STATUS.md                    # Updated master status
FIND_MISSING_TRY_BLOCKS.md          # Debugging guide
```

### **docs/ Specifications (14 files):**
```
docs/
├── SPEC_auth.md                     # Auth system (Phase 6)
├── SPEC_multi_tenancy.md            # Multi-tenancy + RLS
├── SPEC_match-control-centre.md     # Match Control Center (includes uneven teams)
├── SPEC_match-report.md             # Dashboard
├── SPEC_background_jobs.md          # Background jobs
├── SPEC_balance_by_rating_algorithm.md
├── SPEC_balance_by_performance_algorithm.md
├── SPEC_performance_rating_system.md
├── SPEC_LLM-player-profile.md       # AI profiles
├── SPEC_RSVP.md                     # Future: RSVP system
├── fixing-heavy-wins.md             # Heavy wins implementation
├── FUTURE_PROBLEMS.md               # Technical debt tracker
├── Billing_Plan.md                  # Future: Billing
├── marketing_spec.md                # Future: Marketing
└── PLAN_marketing_sandbox_guides.md # Future: Guides
```

### **Coding Standards (1 file):**
```
.cursor/rules/code-generation.mdc    # Updated with RLS patterns
```

### **Other Locations (1 file):**
```
worker/README.md                     # Worker docs
sql/migrations/README.md             # Migration docs
src/components/admin/team/README.md  # Component docs
```

---

## ✅ Benefits of Cleanup

**Before Cleanup:**
- 75 markdown files scattered across project
- Unclear what's current vs obsolete
- Duplicate information in multiple places
- Hard to find relevant docs

**After Cleanup:**
- 18 essential files (76% reduction!)
- Clear organization: Specs in `/docs`, Status in root
- Single source of truth for each topic
- Easy to find current information

---

## 🎯 Action Items

### **Immediate (Before Cleanup):**
1. ✅ **Update `CURRENT_STATUS.md`**
   - Add RLS refactor section
   - Add performance optimization section
   - Add Match Control Center completion
   - Update "What's Next" section

2. ✅ **Update `docs/SPEC_multi_tenancy.md`**
   - Add RLS architecture decision (from RLS_REFACTOR_COMPLETE.md)
   - Add connection pooling issue and solution
   - Note `withTenantFilter()` pattern

3. ✅ **Update `docs/SPEC_auth.md`**
   - Verify Phase 6 status
   - Add any missing completion notes

### **After Updates (Safe to Delete):**
4. Delete 40 obsolete files (list above)
5. Keep 20 essential files
6. Merge 15 files into specs/status

---

## 📝 Files Needing Your Decision

**Check these before deleting:**

1. **`docs/SPEC_in_out_functionality_plan.md`**
   - Is In/Out (RSVP) feature implemented?
   - If yes → Merge into SPEC_RSVP.md
   - If no → Keep as future plan

2. **`docs/SPEC_season_refactor`**
   - Is this a directory or file?
   - What's the status of season refactor?

3. **`RLS_REFACTOR_COMPLETE.md` + `SESSION_COMPLETE_RLS_FIX.md` + `QUICK_START_TESTING.md`**
   - Keep ONE for reference (RLS_REFACTOR_COMPLETE.md has best technical details)
   - Delete the other two after merging key points

---

**Ready for me to update the 3 key docs, then you can review before we delete the 40 files?** 🎯
