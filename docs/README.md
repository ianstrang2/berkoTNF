# Capo Documentation Index

**Last Updated:** November 26, 2025  
**Purpose:** Single source of truth for all documentation  
**How to use:** Find the doc you need, copy filename, open in Cursor

---

## 📋 Quick Navigation

**For feature work:** Check Core Architecture Specs → Include relevant spec in context  
**For mobile work:** Start with `MOBILE_SPEC.md` → Reference subdirectories as needed  
**For TestFlight:** Start with `TESTFLIGHT_START_HERE.md`  
**For vibe coding article:** Reference `App_History.md` (narrative timeline)

---

## 🏗️ Core Architecture Specs

**Purpose:** Technical specifications for major systems  
**When to include:** Working on that specific feature area  
**Keep focused:** Only include sections above archive dividers

| File | Lines | Status | Purpose | Include When... |
|------|-------|--------|---------|----------------|
| `SPEC_auth.md` | 890 | ✅ TIDIED ✨ | Authentication, authorization, roles | Login, signup, sessions, role management |
| `SPEC_multi_tenancy.md` | 741 | ✅ TIDIED ✨ | Tenant isolation, RLS, filtering | Multi-tenant features, tenant-scoped queries |
| `SPEC_match-control-centre.md` | 499 | ✅ TIDIED ✨ | Match lifecycle (Draft→Balanced→Complete) | Match creation, team balancing, match management |
| `SPEC_background_jobs.md` | 320 | ✅ TIDIED ✨ | Stats update job system | Background processing, workers, job queues |
| `SPEC_Modals.md` | 255 | ✅ TIDIED ✨ | Modal patterns & standards | Creating any modal/dialog in UI |
| `SPEC_LLM-player-profile.md` | 221 | ✅ TIDIED ✨ | AI player bio generation | Player profile features, LLM integration |
| `SPEC_match-report.md` | 197 | ✅ TIDIED ✨ | Match report dashboard | Post-match stats display, feat detection |
| `SPEC_performance_rating_system.md` | 171 | ✅ TIDIED ✨ | EWMA power rating calculations | Player rating system, trends, percentiles |
| `SPEC_balance_by_performance_algorithm.md` | 313 | ✅ Clean | Team balancing (EWMA power ratings) | Performance-based team balancing |
| `SPEC_Marketing.md` | 142 | ✅ Clean | Marketing pages, analytics, safe areas | Marketing pages, Plausible, attribution |
| `SPEC_balance_by_rating_algorithm.md` | 98 | ✅ Clean | Team balancing (position-based) | Position-based team balancing |
| `SPEC_PlayerSettings.md` | 380 | ✅ Ready | Player settings page (name, email, club) | Implementing player profile management |
| `SPEC_RSVP.md` | ~3600 | 📋 Design v6.0 | RSVP system (NOT BUILT) | Three modes (Manual/RSVP/Auto-pilot), simplified states, timestamps-driven UI |
| `SPEC_Communications.md` | ~300 | 📋 New | All emails & notifications inventory | Editing notification copy, adding new communications |

### Key Patterns

**Multi-tenancy:** All queries MUST use `withTenantFilter(tenantId)` - see `SPEC_multi_tenancy.md` Section Q  
**Modals:** Use `SoftUIConfirmationModal` for confirms, mobile-safe custom pattern for forms - see `SPEC_Modals.md`  
**Auth:** Phase 2 pattern (`withTenantContext` wrapper) - see `SPEC_auth.md` Section O  
**Team Balancing:** Two systems - Performance (EWMA) and Rating (position) - see respective specs

---

## 📱 Mobile App Documentation

**Purpose:** iOS/Android app development and submission  
**Architecture:** Webview wrapper (loads Vercel deployment)  
**Start here:** `MOBILE_SPEC.md` for architecture overview

### Core Mobile Docs

| File | Lines | Purpose | When to Read |
|------|-------|---------|--------------|
| `MOBILE_SPEC.md` | 845 | **⭐ START HERE** - Complete architecture | Understanding mobile app setup, build modes, API routing |
| `MOBILE_USER_GUIDE.md` | 527 | Commands & daily workflows | Development, building, testing mobile apps |
| `MOBILE_APP_STATUS.md` | 307 | Current submission status | Checking TestFlight progress, what's done/todo |

**Archived (Issues Resolved):**
- `ARCHIVE_mobile_security_audit.md` (371 lines) - ✅ Audit complete (ATS fix applied)
- `ARCHIVE_mobile_safe_area_fix.md` (270 lines) - ✅ Issue resolved (CSS fallback)

### Mobile Subdirectories

**`ios/` - iOS-specific guides**
- `README.md` - iOS quick start
- `SETUP_CHECKLIST.md` - First-time Mac setup (detailed)
- `PRE_PRODUCTION_CHECKLIST.md` - 18-step checklist before submission
- `ATS_FIX_APPLIED.md` - App Transport Security fix (config-specific plists)

**`mobile/` - Cross-platform guides**
- `BUILD_WORKFLOW.md` - Build process details
- `API_GUIDE.md` - API migration patterns (`apiFetch` helper)
- `CAPACITOR_7_CHANGES.md` - Capacitor 7 migration notes

### Key Mobile Patterns

**API Calls:** Always use `apiFetch('/path')` - works on web, iOS, Android (218 uses, 62 files)  
**Navigation:** Always use `router.push()` for internal links (NOT `window.location` or `<a href>`)  
**Build Modes:** Dev (live reload) vs Prod (static + Xcode/Android Studio)  
**Safe Areas:** Use `.pt-safe` CSS class for iOS notch/Android status bar  
**Deep Links:** `capo://` custom scheme + universal links configured

---

## 🚀 TestFlight Submission Guides (Nov 2025)

**Purpose:** Complete guides for submitting iOS app to TestFlight  
**Status:** Ready to submit (screenshots complete, guides comprehensive)  
**Why 5 docs?** Different use cases - navigation hub, detailed walkthrough, quick reference, progress tracker, FAQ

**Start here:** `TESTFLIGHT_START_HERE.md` - Navigation hub

| File | Lines | Use Case |
|------|-------|----------|
| `TESTFLIGHT_START_HERE.md` | 272 | **⭐ START HERE** - Navigation hub and quick start |
| `TESTFLIGHT_SUBMISSION_GUIDE.md` | 1131 | Read first - Complete step-by-step walkthrough |
| `TESTFLIGHT_QUICK_REFERENCE.md` | TBD | Keep open during submission - One-page cheat sheet |
| `TESTFLIGHT_CHECKLIST.md` | TBD | Track progress - Print and check off steps |
| `TESTFLIGHT_FAQ.md` | TBD | Questions - Detailed explanations |

**Rationale for 5 docs:** Each serves distinct purpose (read once vs reference vs tracker)  
**Timeline:** ~2 hours active time (Apple signup → Archive → TestFlight)  
**Next step:** Apple Developer account ($99/year, 24h approval)

---

## 📚 Reference & Planning Documents

**Purpose:** Historical records, future planning, tech debt tracking  
**Not for feature implementation:** Use for context, planning, article writing

| File | Purpose | Use For |
|------|---------|---------|
| `App_History.md` | **Narrative timeline** for vibe coding article (1460 lines) | Writing article, understanding project history |
| `FUTURE_PROBLEMS.md` | Tech debt & scaling challenges tracker | Identifying known issues, planning future work |
| `ARCHITECTURE_DECISION_RECORD.md` | Major architecture decisions log | Understanding why key decisions were made |
| `Billing_Plan.md` | Future billing system design (NOT BUILT) | Future billing implementation reference |
| `PLAN_marketing_sandbox_guides.md` | Marketing implementation plan | Marketing page development |

### Archived Documentation

**Moved to archive:**
- ✅ `ARCHIVE_heavy_wins_implementation.md` (927 lines) - Heavy win threshold implementation (2024)
- ✅ `MOBILE_ARCHITECTURE.md` - Deleted (duplicate of MOBILE_SPEC.md)
- ✅ `marketing_spec.md` - Deleted (duplicate of SPEC_Marketing.md)

**Keep for reference:**
- `MERMAID_Auth.md` - Auth flow diagrams (still useful)

---

## 🧹 Documentation Maintenance Standards

### For Cursor: Creating New Docs

**Use standard prefixes:**
- `SPEC_[feature].md` - Technical specifications
- `MOBILE_[topic].md` - Mobile platform docs  
- `PLAN_[feature].md` - Implementation plans
- `TESTFLIGHT_[topic].md` - TestFlight guides
- `ARCHIVE_[name].md` - Deprecated content

**During feature work:**
1. Create temp docs as `TEMP_[feature]_[date].md` in `/docs`
2. Use for: exploration notes, breakdowns, current status tracking
3. **After feature complete:**
   - Merge valuable insights into relevant `SPEC_*.md`
   - Delete temp file (don't let them accumulate)

**Why temp cleanup matters:** Cursor creates MANY temp docs during complex features - discipline prevents doc sprawl

### For Humans: Tidying Specs

**Goal:** Keep specs focused and efficient (target < 500 lines if possible)

**Standard spec structure:**
```markdown
# [Feature] Specification

**Last Updated:** [Date]
**Status:** Current / In Development / Deprecated

## Overview
[One paragraph - what this system does]

## Current Design
[How it works NOW - this is what Cursor reads most]

## Key Decisions & Rationale
- 2025-10: Why we chose X over Y
- 2025-09: Major architecture refactor

## Implementation Notes
[Gotchas, edge cases, important patterns]

---
## Archive
[Anything deprecated - OR move to ARCHIVE_*.md if huge]
```

**When to split a spec:**
Only if BOTH conditions met:
1. File exceeds 1000 lines
2. Has clearly separable concerns

**Example:** `SPEC_auth.md` (4432 lines) candidates for split:
- `SPEC_auth.md` - Core flows (< 600 lines)  
- `SPEC_auth_roles.md` - Role management
- `SPEC_auth_mobile.md` - Mobile-specific patterns
- `ARCHIVE_auth_v1.md` - Old implementations

**Don't overdo it:** Only split when genuinely needed for clarity/token efficiency

### Token Efficiency Tips

**For Cursor context:**
- Include ONLY the spec sections you need (not entire file)
- Use line ranges: `@SPEC_auth.md:1-400` to limit context
- Archive sections are low priority - exclude unless investigating history
- Use this doc map to find the right spec quickly

**Archive divider:** Use `---` to separate current (top) from archive (bottom)  
**Cursor instruction:** "Only read above the Archive section unless specifically investigating history"

---

## 🔍 Finding What You Need

### Common Tasks → Which Docs

| Task | Primary Doc | Also Check |
|------|-------------|------------|
| **Login/auth flows** | `SPEC_auth.md` | - |
| **Tenant isolation** | `SPEC_multi_tenancy.md` | `SPEC_auth.md` (roles) |
| **Team balancing** | `SPEC_balance_by_performance_algorithm.md` | `SPEC_balance_by_rating_algorithm.md` |
| **Match management** | `SPEC_match-control-centre.md` | `SPEC_match-report.md` |
| **Player ratings** | `SPEC_performance_rating_system.md` | `SPEC_balance_by_performance_algorithm.md` |
| **Player settings** | `SPEC_PlayerSettings.md` | `SPEC_auth.md` (roles) |
| **Creating modals** | `SPEC_Modals.md` | - |
| **Background jobs** | `SPEC_background_jobs.md` | - |
| **Mobile development** | `MOBILE_SPEC.md` | `MOBILE_USER_GUIDE.md`, `ios/`, `mobile/` |
| **TestFlight submission** | `TESTFLIGHT_START_HERE.md` | All `TESTFLIGHT_*.md` files |
| **Marketing pages** | `SPEC_Marketing.md` | `marketing_spec.md` (older version) |
| **Writing article** | `App_History.md` | All specs for technical details |

### Quick Reference Patterns

**Authentication:** Phase 2 pattern with `withTenantContext` - see coding standards  
**Database queries:** Always use `withTenantFilter(tenantId)` for tenant isolation  
**Modals:** `SoftUIConfirmationModal` (simple) or mobile-safe custom (forms)  
**Mobile API:** Always use `apiFetch('/path')` not raw `fetch()`  
**Background jobs:** Enqueue via `/api/admin/enqueue-stats-job`

---

## 📊 Documentation Health

### Documentation Health (Nov 26, 2025)

**✅ Major Tidying Complete (Nov 26, 2025):**

**Specs Tidied (8 files):**
- ✅ `SPEC_auth.md` - 4432 → 890 lines (80% reduction)
- ✅ `SPEC_multi_tenancy.md` - 2508 → 741 lines (70% reduction)
- ✅ `SPEC_match-control-centre.md` - 1906 → 499 lines (74% reduction)
- ✅ `SPEC_background_jobs.md` - 849 → 320 lines (62% reduction)
- ✅ `SPEC_Modals.md` - 768 → 255 lines (67% reduction)
- ✅ `SPEC_LLM-player-profile.md` - 1035 → 221 lines (79% reduction)
- ✅ `SPEC_match-report.md` - 257 → 197 lines (23% reduction)
- ✅ `SPEC_performance_rating_system.md` - 282 → 171 lines (39% reduction)

**Total Token Savings:**
- **Before:** 12,037 lines across 8 specs
- **After:** 3,294 lines across 8 specs
- **Reduction:** 73% (8,743 lines removed)

**Files Deleted (5 total):**
- ✅ MOBILE_ARCHITECTURE.md (duplicate of MOBILE_SPEC)
- ✅ marketing_spec.md (duplicate of SPEC_Marketing)
- ✅ fixing-heavy-wins.md (old implementation doc, in git history)
- ✅ MOBILE_SAFE_AREA_ISSUE.md (resolved issue, in git history)
- ✅ MOBILE_SECURITY_AUDIT.md (audit complete, in git history)

**Original specs archived in `/docs/archive/` (reference only):**
- `SPEC_auth_v6.5_original.md` (3756 lines) - Original with full implementation history
- `SPEC_multi_tenancy_v2.1_original.md` (2043 lines) - Original with phase details
- `SPEC_match_control_original.md` (1616 lines) - Original with component details

**Specs Not Needing Changes:**
- ✅ SPEC_balance_by_performance_algorithm.md (313 lines) - Already focused
- ✅ SPEC_balance_by_rating_algorithm.md (98 lines) - Already concise
- ✅ SPEC_Marketing.md (142 lines) - Already concise
- ⏭️ SPEC_RSVP.md (2473 lines) - Design doc (not built), intentionally detailed

**Coding Standards:**
- ✅ Updated `.cursor/rules/code-generation.mdc` with doc standards section

**🟢 Current State:**
- All specs under 1103 lines (target < 500 mostly achieved)
- Clear structure with archive sections
- Mobile docs well-organized
- TestFlight guides comprehensive
- Doc map in place

### Maintenance Schedule

**After each major feature:**
- [ ] Update relevant `SPEC_*.md` with new patterns
- [ ] Delete any `TEMP_*.md` files created
- [ ] Update this doc map if new specs added
- [ ] Check spec line counts - split if > 1000 lines

**Monthly review:**
- [ ] Archive completed implementation plans
- [ ] Check for duplicate documentation
- [ ] Update "Last Updated" dates on active specs
- [ ] Review FUTURE_PROBLEMS.md for resolved items

---

## 🎯 Success Metrics

**Good documentation:**
- ✅ Specs are < 500 lines (target) or < 1000 lines (max)
- ✅ Clear structure: Overview → Design → Decisions → Archive
- ✅ Archive section for deprecated content
- ✅ This doc map kept up to date
- ✅ No TEMP_ files lingering
- ✅ No duplicate docs

**Token efficiency:**
- ✅ Cursor includes only relevant sections
- ✅ Archive sections excluded by default
- ✅ Doc map helps find right spec quickly
- ✅ No huge specs eating context windows

---

**Last Review:** November 26, 2025 (Major tidying complete ✨)  
**Next Review:** After next major feature implementation  
**Maintainer:** Ian (with Cursor assistance)

