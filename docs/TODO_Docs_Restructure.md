# Documentation Restructure - Future Work

**Status:** 📋 Planned for future session  
**Priority:** Low (current docs work, but could be optimized)

---

## Problem Statement

**Current state:**
- `SPEC_multi_tenancy.md` - **2,508 lines** 😱
- `SPEC_auth.md` - **4,135 lines** 😱😱
- Other specs - Hundreds of lines each

**Impact:**
- When AI needs to reference these, reads thousands of lines
- Most content is examples, migration history, alternatives
- Could be much more concise

---

## Restructure Strategy

### Principle: **Inverted Pyramid** (Journalism model)

**Structure each spec as:**

**1. Quick Reference (Top 50 lines):**
- What it is
- When to use it
- Core pattern (1 example)
- Common mistakes (bullet points)

**2. Detailed Examples (Next 200 lines):**
- Multiple scenarios
- Edge cases
- Migration patterns

**3. Historical Context (Bottom):**
- Why we made decisions
- What we tried before
- Migration notes from old systems

**Benefit:** AI reads top section (50 lines), only continues if needed.

---

## Specific Plans

### SPEC_multi_tenancy.md (2,508 → ~400 lines)

**Keep:**
- Security model overview
- `withTenantFilter()` patterns
- RLS architecture decision
- Critical patterns only

**Move to appendix:**
- Migration history (Phase 1, 2, 3, etc.)
- All the "Before/After" comparisons
- Old vulnerability descriptions (already fixed)

### SPEC_auth.md (4,135 → ~600 lines)

**Keep:**
- Current auth flows (phone-only)
- Session management
- API patterns
- Role definitions

**Move to appendix:**
- Phase 1-7 implementation history
- Old dual-auth system docs (no longer used)
- Test scenarios (completed)
- Pre-production checklists

### SPEC_Modals.md (Keep as-is, ~300 lines)
- Already concise
- Good structure
- Just created, optimized

---

## When to Do This

**Not urgent because:**
- Current docs are accurate
- AI can read them when needed
- Coding standards now compressed (saves most tokens)

**Good time to do it:**
- After major feature complete (RSVP system?)
- During maintenance phase
- When docs feel stale/outdated
- When you notice AI reading unnecessary sections

---

## Estimated Effort

- SPEC_multi_tenancy.md: 2-3 hours
- SPEC_auth.md: 3-4 hours
- Other specs: 1 hour each
- **Total:** ~10 hours for complete restructure

**ROI:** Moderate - saves tokens on reference reads, improves maintainability

---

**Status:** Documented for future. Not blocking current work.

