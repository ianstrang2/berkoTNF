# Setup UI Improvements - Analysis

**Date:** December 1, 2025

---

## Issue 1: Balancing Screens Not Optimized for Mobile

**Current State:**
- BalanceAlgorithmSetup uses OLD layout with lots of spacing
- Has section headers "Balance Algorithm Settings"
- Has descriptive text paragraphs
- Each position group (Defenders/Midfielders/Attackers) takes lots of vertical space

**Should Be:**
- Compact like the new CompactAppConfig components
- No redundant headers (nav is self-explanatory)
- Minimal spacing between sliders
- Info icons for descriptions instead of inline text

**Fix:** Refactor BalanceAlgorithmSetup to match CompactAppConfig styling

---

## Issue 2: Default Accordion State on Mobile

**Current:** All sections expanded by default
**Proposal:** On mobile (< 768px), collapse all except first section

**Implementation:**
```typescript
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
isExpanded: !isMobile || index === 0
```

**Pros:** Less scrolling on mobile
**Cons:** User might not notice collapsed sections

**Alternative:** Keep all expanded, but reduce spacing (better for discoverability)

---

## Issue 3: Balance Algorithm Save Pattern

**Current:** Old pattern
- "SAVE CHANGES" button (always visible)
- "RESET TO DEFAULTS" button
- No exit warning
- No button flash feedback

**Should Be:** New pattern
- Floating save button (only when changes detected)
- Button flash: Grey → Purple (dirty) → Green (saved) → Grey
- Exit warning modal if unsaved changes
- Auto-detects changes via form state

**Fix:** Refactor BalanceAlgorithmSetup to use new save pattern

---

## Issue 4: Reset to Defaults Missing

**Problem:** CompactAppConfig removed "Reset to Defaults" functionality

**Options:**

**Option A: Per-Section Reset (Recommended)**
- Add "Reset Section" button in each card header (next to collapse icon)
- Only visible when section is expanded
- Resets just that section's values
- Uses SoftUIConfirmationModal

**Option B: Global Reset**
- Add "Reset All" button at top of page
- Resets entire page
- Too risky for users

**Option C: Per-Field Reset**
- Add small reset icon next to each modified field
- Too cluttered

**Recommendation:** Option A - Per-section reset with confirmation modal

---

## Proposed Changes

### 1. Compact Balancing UI
- Remove section header "Balance Algorithm Settings"
- Remove descriptive paragraph
- Tighter spacing between sliders
- Reduce padding from p-6 to p-4
- Smaller font sizes for labels

### 2. Mobile Accordion Default
- Keep all expanded (better discoverability)
- Focus on reducing spacing instead
- Users can collapse manually if desired

### 3. New Save Pattern for Balancing
- Track form changes: `hasUnsavedChanges`
- Floating save button (bottom-20 on mobile, bottom-4 on desktop)
- Green flash on success
- Exit warning modal
- Remove old SAVE CHANGES button

### 4. Add Reset to Defaults
- Add to each CompactAppConfig card header
- Show on hover/click (desktop/mobile)
- Icon button (RotateCcw from lucide-react)
- Confirmation modal before reset
- Only resets that section

---

## Implementation Priority

1. ✅ **Critical:** Add Reset to Defaults to CompactAppConfig
2. ⚠️ **Important:** Update BalanceAlgorithmSetup save pattern
3. 📱 **Nice to have:** Compact spacing on Balancing screens
4. 🤔 **Consider:** Default collapsed state on mobile (low priority)

