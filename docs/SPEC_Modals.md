# Modal & Dialog Specification

**Version:** 1.0.0  
**Last Updated:** January 8, 2025  
**Status:** ✅ Active - Standards Agreed & Implemented

**Note:** This is the single source of truth for modal standards. Historical audit docs deleted and consolidated here.

---

## Executive Summary

**Total Modals Found:** 30+ modal instances across the application

**Current State:**
- ⚠️ 4 different modal patterns in use
- ⚠️ Inconsistent styling (buttons, colors, borders, shadows)
- ⚠️ Inconsistent mobile handling (3 modals broke on mobile)
- ⚠️ Inconsistent icon usage (emoji vs SVG, colors vary)
- ✅ Phase 5 (Oct 2025) standardized 8 modals, but new ones drifted

**Goal:** Establish ONE standard pattern for each modal type, migrate legacy modals over time.

---

## Complete Modal Inventory

### Category A: Dedicated Modal Components (11 files)

| # | Component | File | Type | Has Inputs | Mobile Safe | Pattern | Uses Standard | Notes |
|---|-----------|------|------|------------|-------------|---------|---------------|-------|
| 1 | **PlayerFormModal** | `admin/player/` | Form | ✅ Many | ✅ Fixed | Custom | ⚠️ Partial | Name, phone, 6 sliders, club |
| 2 | **SeasonFormModal** | `admin/season/` | Form | ✅ 2 dates | ✅ Fixed | Custom | ⚠️ Partial | Start/end date pickers |
| 3 | **SeasonDeleteModal** | `admin/season/` | Confirm | ❌ None | ✅ Good | SoftUI | ✅ Yes | Wraps SoftUIConfirmationModal |
| 4 | **MatchModal** | `team/modals/` | Form | ✅ 2 fields | ✅ Fixed | Custom | ⚠️ Partial | Date + team size |
| 5 | **MatchCompletedModal** | `team/modals/` | Success | ❌ None | ✅ Good | Custom | ⚠️ Partial | Success message only |
| 6 | **BalanceOptionsModal** | `admin/matches/` | Select | ❌ Radio | ✅ Fixed | Custom | ⚠️ Partial | 3 balance methods |
| 7 | **SingleBlockedModal** | `admin/matches/` | Alert | ❌ None | ✅ Good | SoftUI | ✅ Yes | Wraps SoftUIConfirmationModal |
| 8 | **AppPromoModal** | `modals/` | Marketing | ❌ None | ✅ Good | Custom | ⚠️ Different | Post-login app download |
| 9 | **ComingSoonModal** | `marketing/` | Marketing | ❌ None | ⚠️ Unknown | Custom | ⚠️ Different | Marketing page only |
| 10 | **AttributeGuide** | `admin/player/` | Info | ❌ None | ⚠️ Unknown | Custom | ❌ No | Player attribute help |
| 11 | **FantasyPointsTooltip** | `ui-kit/` | Info | ❌ None | ⚠️ Unknown | Custom | ❌ No | Fantasy points explainer |

### Category B: Reusable Modal Systems (5 components)

| # | Component | File | Type | Usage Count | Standard | Notes |
|---|-----------|------|------|-------------|----------|-------|
| 12 | **SoftUIConfirmationModal** | `ui-kit/` | Confirm | 11 locations | ✅ Primary | SweetAlert2 wrapper |
| 13 | **SimpleTooltip** | `ui-kit/` | Info | 1 location | ✅ New | Lightweight click tooltip (mobile) |
| 14 | **ConfirmationDialog** | `ui-kit/` | Confirm | Unknown | ⚠️ Legacy | Old pattern, needs audit |
| 15 | **ConfirmationModal** | `ui-kit/` | Confirm | Unknown | ⚠️ Legacy | Adapter for above |
| 15 | **ConfirmDialog** | `team/modals/` | Confirm | Unknown | ⚠️ Legacy | Simple confirm, old styling |

### Category C: Inline Modals (5+ instances)

| # | Component | Location | Type | Has Inputs | Mobile Safe | Standard | Notes |
|---|-----------|----------|------|------------|-------------|----------|-------|
| 16 | **Approve Join Request** | `PendingJoinRequests` | Form | ✅ Text input | ✅ Fixed | Custom | Complex approval flow |
| 17 | **Reject Join Request** | `PendingJoinRequests` | Confirm | ❌ None | ✅ Good | SoftUI | Uses SoftUIConfirmationModal |
| 18 | **Club Invite Link** | `ClubInviteLinkButton` | Info | ❌ None | ⚠️ Unknown | Custom | Displays shareable link |
| 19 | **Tenant Selector** | `ProfileDropdown` | Select | ❌ None | ✅ Good | Custom | Superadmin tenant switch |
| 20 | **Admin Auth Prompt** | `AdminModeToggle` | Form | ✅ Password | ⚠️ Unknown | Custom | Admin verification |

### Category D: SoftUIConfirmationModal Usage Sites (11 locations)

| # | Usage Location | Purpose | Icon | Mobile | Notes |
|---|----------------|---------|------|--------|-------|
| 21 | `PendingJoinRequests` | Reject player | warning | ✅ | Phase 6.6 |
| 22 | `BalanceTeamsPane` | Clear teams | warning | ✅ | Confirmation |
| 23 | `PerformanceBalanceSetup` | Save settings | info | ✅ | 2 modals (save + reset) |
| 24 | `ProfileDropdown` | Logout | question | ✅ | Desktop |
| 25 | `PlayerPoolPane` | Clear pool | warning | ✅ | Confirmation |
| 26 | `BalanceAlgorithmSetup` | Save/reset/error | mixed | ✅ | 3 modals total |
| 27 | `AppConfig` | Reset section | warning | ✅ | Config management |
| 28 | `MobileHeader` | Logout | question | ✅ | Mobile |
| 29 | `MatchListPage` | Delete match | warning | ✅ | Delete confirmation |
| 30 | `SeasonDeleteModal` | (wrapper) | warning | ✅ | Wrapped component |
| 31 | `SingleBlockedModal` | (wrapper) | warning | ✅ | Wrapped component |

**Estimated Total Modal Instances:** **31 modals** (11 component files + 11 SoftUI usages + 9 inline/legacy)

---

## Current Patterns Analysis

### Pattern 1: SoftUIConfirmationModal (SweetAlert2) ⭐ **RECOMMENDED FOR SIMPLE CONFIRMS**

**Usage:** 11+ locations  
**When:** Simple confirmations, alerts, success messages (no form inputs)

**Pros:**
- ✅ Consistent styling across all usages
- ✅ Gradient icons work perfectly
- ✅ Mobile-friendly out of the box
- ✅ Handles all confirmation logic
- ✅ Easy to use (just pass props)

**Cons:**
- ❌ Can't have form inputs inside
- ❌ Limited layout customization
- ❌ Dependent on SweetAlert2 library

**Standard Implementation:**
```typescript
<SoftUIConfirmationModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleAction}
  title="Action Title"
  message="Are you sure?"
  confirmText="Confirm"
  cancelText="Cancel"
  isConfirming={loading}
  icon="warning" // or 'error', 'success', 'info', 'question'
/>
```

**✅ Use For:**
- Delete confirmations
- Logout confirmations
- Reset confirmations
- Success messages
- Error alerts
- Any yes/no question

---

### Pattern 2: Custom Form Modals 🔧 **RECOMMENDED FOR FORMS**

**Usage:** 5 modals (PlayerForm, SeasonForm, Match, Approve, etc.)  
**When:** Complex forms, multi-step flows, custom layouts

**✅ MOBILE-SAFE PATTERN (Verified Working - January 2025):**
```typescript
<div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
  {/* Background overlay */}
  <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={onClose}></div>
  
  {/* Modal panel */}
  <div 
    className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6 my-auto" 
    style={{ maxHeight: 'calc(100vh - 4rem)' }}
    onClick={(e) => e.stopPropagation()}
  >
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <h3 className="text-lg font-semibold text-slate-700 mb-4">Modal Title</h3>
      
      {/* Content - forms, inputs, etc. */}
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
      </form>
      
      {/* Action buttons */}
      <div className="flex justify-center gap-3 mt-6">
        <button className="...gradient-primary">Confirm</button>
        <button className="...gradient-secondary">Cancel</button>
      </div>
    </div>
  </div>
</div>
```

**Critical Features (ALL Required):**
- ✅ `flex items-start` - NOT `items-center` (that causes shunting off-screen!)
- ✅ `justify-center` - Horizontal centering only
- ✅ `my-auto` - Vertical centering when space available
- ✅ `p-4 pt-8` - Padding on container
- ✅ Outer div: `maxHeight: calc(100vh - 4rem)`
- ✅ Inner scroll wrapper: `maxHeight: calc(100vh - 8rem)`
- ✅ `overflow-y-auto` on both container and scroll wrapper
- ❌ **AVOID `autoFocus`** - Let user tap input (prevents instant keyboard)

**Button Standard:**
```typescript
// Primary action (left)
className="inline-block px-4 py-2 font-medium text-white uppercase rounded-lg 
  bg-gradient-to-tl from-purple-700 to-pink-500 
  hover:scale-102 active:opacity-85 shadow-soft-md
  disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary action (right)  
className="inline-block px-4 py-2 font-medium text-slate-700 uppercase rounded-lg
  bg-gradient-to-tl from-slate-100 to-slate-200
  hover:scale-102 active:opacity-85 shadow-soft-md
  ml-3"
```

**✅ Use For:**
- Add/edit player
- Create season
- Create match
- Any form with inputs
- Multi-step flows

---

### Pattern 3: Legacy Dialogs ✅ **DELETED - MIGRATION COMPLETE**

**Status:** ✅ All 7 usages migrated, 3 legacy files deleted (January 8, 2025)

**Deleted Components:**
- ~~`ConfirmationDialog.component.tsx`~~ (deleted)
- ~~`ConfirmationModal.component.tsx`~~ (deleted, was adapter)
- ~~`ConfirmDialog.component.tsx`~~ (deleted, had zero usages)

**Migration Summary:**
- FantasyPointsSetup: 2 modals migrated
- MatchSettingsSetup: 2 modals migrated
- MatchReportSetup: 2 modals migrated
- TeamTemplates: 1 modal migrated
- **Total:** 7 modals → SoftUIConfirmationModal

**Result:** All modals now use standard patterns ✅

---

### Pattern 4: Custom One-Off Modals 🎨 **CASE-BY-CASE**

**Usage:** 3-4 modals (AppPromo, ComingSoon, AttributeGuide, etc.)

**When These Are OK:**
- Marketing pages (different design system)
- Unique UX requirements
- Third-party integrations

**When to Standardize:**
- If used in admin/player app
- If similar to other modals
- If causing maintenance burden

---

## Design System Standards

### 🎨 Visual Standards (MANDATORY)

#### Colors & Gradients
```typescript
// Primary gradient (action buttons, success icons)
from-purple-700 to-pink-500

// Secondary gradient (cancel buttons)
from-slate-100 to-slate-200

// Warning/error gradient (delete, reject)
from-red-600 to-red-700

// Backdrop
bg-gray-900 bg-opacity-75
```

#### Icons
- **❌ NEVER use emojis** (📱, ⚠️, ✅, etc.)
- **✅ ALWAYS use SVG** with appropriate gradient background
- **Size:** 48px circle for modal headers, 24px for inline icons
- **Colors:** Purple-pink gradient (questions/success), Red gradient (warnings/errors)

**Standard Icon Implementation:**
```tsx
{/* Question/Info Icon - Purple-Pink Gradient */}
<div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
</div>

{/* Warning Icon - Purple-Pink Gradient (not red!) */}
<div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
</div>

{/* Error Icon - Red Gradient (only for actual errors) */}
<div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
</div>

{/* Success Icon - Purple-Pink Gradient */}
<div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
</div>
```

#### Buttons

**Order (Context-Dependent for Safety):**
- ✅ **Constructive actions** (save, create, confirm): `[Action] [Cancel]`
- ✅ **Destructive actions** (delete, reset, clear): `[Cancel] [Destructive]`
- **Why:** Destructive actions on RIGHT require deliberate reach (macOS/iOS pattern)

**Styling:**
- **Size:** `px-4 py-2` for consistency
- **Font:** `font-medium` not `font-bold`
- **Case:** `uppercase` for consistency
- **Constructive button:** Purple-pink gradient, white text
- **Destructive button:** Red gradient, white text
- **Cancel button:** Slate gradient, dark text
- **Spacing:** `gap-3` between buttons

**Examples:**
```typescript
// Constructive (create player, save settings)
<div className="flex justify-center gap-3">
  <button className="...purple-pink-gradient">Confirm</button>
  <button className="...slate-gradient">Cancel</button>
</div>

// Destructive (delete player, reset data)
<div className="flex justify-center gap-3">
  <button className="...slate-gradient">Cancel</button>
  <button className="...red-gradient">Delete</button>
</div>
```

#### Container
```css
Border radius: rounded-2xl (18px)
Shadow: shadow-soft-xl
Background: bg-white
Max width: max-w-md (forms), max-w-lg (complex), max-w-sm (simple)
Padding: p-6
```

---

## Mobile Requirements (MANDATORY)

### ✅ For Modals WITH Inputs (Forms)

**REQUIRED pattern** to prevent keyboard overflow:

```typescript
{/* Container - starts at top, allows scroll */}
<div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8 overflow-y-auto">
  
  {/* Backdrop */}
  <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={onClose}></div>
  
  {/* Modal - dynamic height with inner scroll */}
  <div 
    className="relative bg-white rounded-2xl max-w-md w-full shadow-soft-xl p-6 my-auto" 
    style={{ maxHeight: 'calc(100vh - 4rem)' }}
  >
    {/* Content wrapper - scrollable */}
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
      {/* All content here */}
    </div>
  </div>
</div>
```

**Why this works:**
- `items-start` - Modal starts at top, doesn't force vertical center
- `my-auto` - Centers when there's space available
- `calc(100vh - 4rem)` - Max height accounts for padding
- Inner scroll wrapper - Content scrolls without breaking layout
- Keyboard appears - Viewport shrinks, modal adapts gracefully

### ✅ For Modals WITHOUT Inputs (Confirmations)

**Simpler pattern acceptable:**

```typescript
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl shadow-soft-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
    {/* Content */}
  </div>
</div>
```

**Still include:**
- `max-h-[90vh]` - Never exceed 90% of viewport
- `overflow-y-auto` - Scroll if needed (rare for simple modals)

---

## Decision Tree: Which Pattern to Use?

```
START: Need to show user something
│
├─ Is it a simple confirmation/alert?
│  │
│  ├─ YES → Use SoftUIConfirmationModal ✅
│  │        (Delete, logout, reset, warnings, success)
│  │
│  └─ NO → Continue...
│
├─ Does it have form inputs?
│  │
│  ├─ YES → Use Custom Form Modal Pattern ✅
│  │        (Add player, create season, etc.)
│  │        MUST use mobile-safe structure
│  │
│  └─ NO → Continue...
│
├─ Is it marketing/landing page?
│  │
│  ├─ YES → Custom modal OK (different design) ✅
│  │        (AppPromo, ComingSoon)
│  │
│  └─ NO → Continue...
│
└─ Is it complex/unique UX?
   │
   ├─ YES → Custom modal with approval ✅
   │        (Document in this spec)
   │
   └─ NO → Probably use SoftUIConfirmationModal ✅
```

---

## Standard Templates

### Template A: Simple Confirmation (Use SoftUIConfirmationModal)

```typescript
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

const [showModal, setShowModal] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);

<SoftUIConfirmationModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleConfirm}
  title="Are you sure?"
  message="This action cannot be undone."
  confirmText="Confirm"
  cancelText="Cancel"
  isConfirming={isProcessing}
  icon="warning" // or 'error', 'success', 'info', 'question'
/>
```

---

### Template B: Form Modal (Mobile-Safe)

```typescript
const [showModal, setShowModal] = useState(false);
const [formData, setFormData] = useState({ name: '' });
const [isProcessing, setIsProcessing] = useState(false);

{showModal && (
  <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-8 overflow-y-auto">
    {/* Backdrop */}
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" 
      onClick={() => setShowModal(false)}
    ></div>
    
    {/* Modal panel */}
    <div 
      className="relative bg-white rounded-2xl max-w-md w-full shadow-soft-xl p-6 my-auto" 
      style={{ maxHeight: 'calc(100vh - 4rem)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Content wrapper - scrollable */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
        
        {/* Header */}
        <h3 className="text-lg font-semibold text-slate-700 mb-4">
          Form Title
        </h3>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Field Label
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                focus:outline-none focus:border-fuchsia-300 text-sm"
              placeholder="Enter value"
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-center gap-3 mt-6">
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-block px-4 py-2 font-medium text-white uppercase rounded-lg 
                bg-gradient-to-tl from-purple-700 to-pink-500 
                hover:scale-102 active:opacity-85 shadow-soft-md
                disabled:opacity-50 disabled:cursor-not-allowed
                text-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25"
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={isProcessing}
              className="inline-block px-4 py-2 font-medium text-slate-700 uppercase rounded-lg 
                bg-gradient-to-tl from-slate-100 to-slate-200 
                hover:scale-102 active:opacity-85 shadow-soft-md
                text-xs leading-pro ease-soft-in tracking-tight-soft bg-150 bg-x-25 ml-3"
            >
              Cancel
            </button>
          </div>
        </form>
        
      </div>
    </div>
  </div>
)}
```

---

### Template C: Simple Tooltip (Mobile Click Hints)

**When to use:** Small informational tooltips for table headers or icons (mobile click alternative to hover)

**Use case:** Column header explanations, icon meanings, brief help text

```typescript
import SimpleTooltip from '@/components/ui-kit/SimpleTooltip.component';

const [showTooltip, setShowTooltip] = useState(false);
const [tooltipMessage, setTooltipMessage] = useState('');

{/* Header with tooltip (works on desktop hover + mobile click) */}
<th 
  className="cursor-help" 
  title="Profile Claimed?"  // Desktop: native browser tooltip on hover
  onClick={(e) => {
    e.stopPropagation();
    setTooltipMessage('Profile Claimed?');  // Mobile: styled tooltip on click
    setShowTooltip(true);
  }}
>
  🔗
</th>

{/* SimpleTooltip component */}
<SimpleTooltip
  isOpen={showTooltip}
  onClose={() => setShowTooltip(false)}
  message={tooltipMessage}
/>
```

**Design Specs:**
- **Size:** Small white card (`max-w-xs` = ~320px)
- **Text:** Normal size (`text-sm`), medium weight
- **Close Button:** Small X with purple-pink gradient SVG
- **Backdrop:** Transparent, click to close
- **Position:** Centered on screen
- **Shadow:** `shadow-soft-xl` (Soft UI standard)
- **Border:** `border-gray-200` (subtle)

**When NOT to use:**
- ❌ Confirmations (use SoftUIConfirmationModal)
- ❌ Forms (use Template B)
- ❌ Long explanations (use dedicated info modal)
- ❌ Desktop-only (just use native `title` attribute)

**Replace these patterns with SimpleTooltip:**
- ❌ `alert('Message')` - Ugly browser popup
- ❌ Large modals for tiny messages - Overkill

---

## Migration Plan

### Phase 1: Immediate ✅ **COMPLETE**
- ✅ Fixed 5 modals with mobile keyboard issues
- ✅ Added gradient icon CSS for SoftUIConfirmationModal
- ✅ Documented standard patterns
- ✅ Standardized z-index to `z-50` (6 files)
- ✅ Replaced all in-app emojis with SVG (9 files)

### Phase 2: Quick Wins ✅ **COMPLETE**
- ✅ Migrated all legacy ConfirmationDialog usage (4 files, 7 modals)
- ✅ Deleted 3 legacy modal components (dead code)
- ✅ Added mobile safety to all form modals
- ✅ Updated coding standards with modal rules

### Phase 3: Long-term (Future)
- [ ] Audit `alert()` calls → Replace with SoftUIConfirmationModal
- [ ] Audit AttributeGuide and FantasyPointsTooltip for mobile
- [ ] Consider modal component library (Radix UI, Headless UI) for accessibility

---

## Inconsistencies Found

### Button Order 🔴
- **Standard:** Action (left) + Cancel (right)
- **Violators:** ConfirmDialog has Cancel (left) + Action (right) ❌
- **Fix:** Update to match standard

### Icon Usage 🔴
- **Standard:** SVG with gradient background (48px circle)
- **Violators:** 
  - AppPromoModal uses emoji: `📱` ❌
  - ComingSoonModal uses SVG ✅ but different gradient
- **Fix:** Replace emojis with SVG

### Button Styling 🔴
- **Standard:** `px-4 py-2 font-medium uppercase`
- **Violators:**
  - ConfirmDialog: `px-4 py-2` but no gradient, wrong colors ❌
  - Some custom modals: Inconsistent padding
- **Fix:** Apply standard button classes

### Mobile Safety 🔴
- **Standard:** Mobile-safe pattern for all form modals
- **Fixed:** PlayerForm, SeasonForm, MatchModal, BalanceOptions, PendingJoinRequests ✅
- **Unknown:** AttributeGuide, FantasyPointsTooltip, AdminModeToggle, ComingSoonModal
- **Fix:** Audit and fix unknowns

### Z-Index 🟡
- **Modals use:** `z-50`, `z-[9999]`, `z-[100]`
- **Inconsistent!** Should standardize
- **Recommendation:** 
  - Standard modals: `z-50`
  - Critical modals (overlays on modals): `z-[60]`
  - No need for `z-[9999]`

---

## Accessibility Checklist (MANDATORY)

All modals MUST have:

- [ ] `role="dialog"` on modal element
- [ ] `aria-modal="true"` on modal element
- [ ] `aria-labelledby` pointing to title ID
- [ ] `aria-describedby` pointing to description (optional)
- [ ] **Focus management:**
  - [ ] Focus first interactive element on open
  - [ ] Focus trap (tab cycles within modal)
  - [ ] Return focus to trigger on close
- [ ] **Keyboard handling:**
  - [ ] ESC key closes modal
  - [ ] Enter key confirms (if appropriate)
- [ ] **Click handling:**
  - [ ] Click outside closes modal
  - [ ] Click modal content doesn't close (stopPropagation)

**Current Status:** Most modals have some accessibility, but not complete. Needs audit.

---

## Coding Standards Update

### When Creating a Modal

**1. Determine Type:**
- Simple confirmation? → Use `SoftUIConfirmationModal`
- Form with inputs? → Use mobile-safe custom pattern
- Unique marketing? → Custom (document here)

**2. Follow Standard:**
- ✅ Reference this spec (`docs/SPEC_Modals.md`)
- ✅ Use SVG icons (never emojis)
- ✅ Use gradient buttons (purple-pink primary, slate secondary)
- ✅ Test on mobile (with keyboard if has inputs)
- ✅ Add to inventory table (below)

**3. Mobile Testing Required:**
- [ ] Open modal on mobile device
- [ ] Tap input field (if has inputs)
- [ ] Keyboard appears
- [ ] Verify: Modal fits, buttons accessible, no zoom
- [ ] Close modal
- [ ] Verify: Page formatting normal

---

## Current Status & Next Steps

### Completed ✅
- [x] Full modal inventory (31 modals found)
- [x] Mobile keyboard fix (5 modals fixed)
- [x] Standard patterns documented
- [x] Design system defined
- [x] Decision tree created

### Needs User Approval 🤔
- [ ] **Agree on standards** - Are these the right patterns?
- [ ] **Icon policy** - Replace emoji with SVG everywhere?
- [ ] **Z-index** - Standardize to z-50?
- [ ] **Legacy migration** - Delete old ConfirmationDialog?

### Future Work 📋
- [ ] Audit `alert()` usage → Replace with modals
- [ ] Audit legacy dialog usage → Migrate to SoftUI
- [ ] Test unknown modals on mobile (AttributeGuide, etc.)
- [ ] Add focus management to all modals
- [ ] Consider modal component library (Radix UI)

---

## Discussion Points

### 1. **Should we keep 2 confirmation patterns?**
- **Option A:** SoftUIConfirmationModal for everything (simple)
- **Option B:** Keep both SoftUI + custom (flexibility)
- **Recommendation:** Keep SoftUI for 90% of cases, custom for complex forms

### 2. **What about emoji icons?**
- **Current:** AppPromoModal uses `📱` emoji
- **Standard:** SVG with gradient background
- **Question:** Replace emoji in existing marketing modals?
- **Recommendation:** Yes for consistency (but low priority)

### 3. **Legacy modals - delete or keep?**
- **Legacy:** ConfirmationDialog, ConfirmationModal, ConfirmDialog
- **Usage:** Unknown (needs audit with `grep`)
- **Question:** Migrate all and delete legacy?
- **Recommendation:** Audit first, then migrate over time

### 4. **Z-index chaos - standardize?**
- **Current:** z-50, z-[9999], z-[100]
- **Recommendation:** 
  - Standard modals: `z-50`
  - Nested modals: `z-[60]` (if ever needed)
  - Remove `z-[9999]` (overkill)

---

## Questions for You

**Before I finalize this spec, please review:**

1. **Are these the right two patterns?**
   - SoftUIConfirmationModal (for simple confirmations)
   - Mobile-safe custom modal (for forms)
   - Or should we add more patterns?

2. **Icon policy:**
   - Mandate SVG everywhere (even marketing modals)?
   - Or allow emoji for casual/marketing contexts?

3. **Button order:**
   - Action (left) + Cancel (right) everywhere?
   - Or flip for destructive actions?

4. **Migration priority:**
   - Fix all modals now (4-6 hours)?
   - Or migrate gradually as we touch each file?

5. **Missing any modal types?**
   - Tooltips/popovers count as modals?
   - Dropdowns count as modals?
   - Full-screen overlays?

---

**Let me know your preferences and I'll finalize the spec with your standards!**

