# Modal & Dialog Specification

**Version:** 1.0.0  
**Last Updated:** November 26, 2025  
**Status:** ✅ Standards Active & Enforced

---

## Executive Summary

**Total Modals:** 30+ modal instances across application

**Standard Patterns (2 only):**
1. **SoftUIConfirmationModal** - For simple confirmations/alerts (90% of cases)
2. **Custom Form Modal** - For complex forms with inputs (mobile-safe pattern)

**Migration:** ✅ Complete (January 2025)
- All legacy modals migrated to standard patterns
- 3 legacy components deleted
- Mobile keyboard issues fixed

---

## Decision Tree: Which Pattern to Use?

```
Need to show user something
│
├─ Simple confirmation/alert?
│  └─ YES → Use SoftUIConfirmationModal ✅
│           (Delete, logout, reset, warnings, success)
│
├─ Has form inputs?
│  └─ YES → Use Custom Form Modal Pattern ✅
│           (Add player, create season, etc.)
│           MUST use mobile-safe structure
│
└─ Marketing/unique UX?
   └─ YES → Custom modal OK ✅
             (Document in this spec)
```

---

## Pattern 1: SoftUIConfirmationModal (Simple Confirms)

**Usage:** 11+ locations  
**When:** Confirmations, alerts, success messages (no form inputs)

### Implementation

```typescript
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

<SoftUIConfirmationModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleAction}
  title="Action Title"
  message="Are you sure?"
  confirmText="Confirm"
  cancelText="Cancel"
  isConfirming={loading}
  icon="warning" // 'error' | 'success' | 'info' | 'question'
/>
```

### Icon Types

**warning** - Purple-pink gradient, exclamation triangle  
**error** - Red gradient, X icon  
**success** - Purple-pink gradient, checkmark  
**info** - Purple-pink gradient, info circle  
**question** - Purple-pink gradient, question mark

### When to Use

✅ **Use for:**
- Delete confirmations
- Logout confirmations  
- Reset confirmations
- Success messages
- Error alerts
- Any yes/no question

---

## Pattern 2: Custom Form Modal (Complex Forms)

**Usage:** 5+ modals  
**When:** Forms with inputs, multi-step flows, custom layouts

### Mobile-Safe Pattern (MANDATORY)

```typescript
{showModal && (
  <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
    {/* Backdrop */}
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-75" 
      onClick={onClose}
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
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          
          {/* Action buttons */}
          <div className="flex justify-center gap-3 mt-6">
            <button
              type="submit"
              className="px-4 py-2 font-medium text-white uppercase rounded-lg 
                bg-gradient-to-tl from-purple-700 to-pink-500 
                hover:scale-102 shadow-soft-md"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-700 uppercase rounded-lg 
                bg-gradient-to-tl from-slate-100 to-slate-200 
                hover:scale-102 shadow-soft-md"
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

### Critical Mobile Features

✅ **Required for mobile keyboard safety:**
- `items-start` - NOT `items-center` (prevents keyboard push-off)
- `justify-center` - Horizontal centering only
- `my-auto` - Vertical center when space available
- `maxHeight: calc(100vh - 4rem)` - Outer container
- `maxHeight: calc(100vh - 8rem)` - Inner scroll wrapper
- `overflow-y-auto` on both wrappers

❌ **Avoid:**
- `autoFocus` on inputs (prevents keyboard surprise)
- `items-center` (causes modal to shift off-screen)

### When to Use

✅ **Use for:**
- Add/edit player
- Create season
- Create match
- Any form with inputs
- Multi-step flows

---

## Design Standards (MANDATORY)

### Icons

**❌ NEVER use emojis** (📱, ⚠️, ✅)  
**✅ ALWAYS use SVG** with gradient background

**Standard Icon Pattern:**
```tsx
{/* Purple-Pink Gradient (default) */}
<div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {/* Icon path */}
  </svg>
</div>

{/* Red Gradient (errors only) */}
<div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {/* Icon path */}
  </svg>
</div>
```

### Buttons

**Size:** `px-4 py-2` consistent  
**Font:** `font-medium` not `font-bold`  
**Case:** `uppercase` for consistency

**Button Order (Context-Dependent):**
- **Constructive actions:** `[Action] [Cancel]` (save, create, confirm)
- **Destructive actions:** `[Cancel] [Destructive]` (delete, reset, clear)

**Why:** Destructive on RIGHT requires deliberate reach (macOS/iOS pattern)

**Gradients:**
```typescript
// Primary (constructive)
bg-gradient-to-tl from-purple-700 to-pink-500

// Secondary (cancel)
bg-gradient-to-tl from-slate-100 to-slate-200

// Destructive (delete)
bg-gradient-to-tl from-red-600 to-red-700
```

### Container

```css
Border radius: rounded-2xl
Shadow: shadow-soft-xl
Background: bg-white
Max width: max-w-md (forms), max-w-sm (simple)
Padding: p-6
Z-index: z-50
```

---

## Accessibility Requirements

**All modals MUST have:**

- ✅ `role="dialog"` on modal element
- ✅ `aria-modal="true"` on modal element
- ✅ `aria-labelledby` pointing to title ID
- ✅ ESC key closes modal
- ✅ Click outside closes modal
- ✅ Click modal content doesn't close (stopPropagation)

**Focus management (recommended):**
- Focus trap (tab cycles within modal)
- Return focus to trigger on close

---

## Modal Inventory

### Using SoftUIConfirmationModal (11 locations)

- `PendingJoinRequests` - Reject player
- `BalanceTeamsPane` - Clear teams
- `PerformanceBalanceSetup` - Save/reset settings
- `ProfileDropdown` - Logout (desktop)
- `PlayerPoolPane` - Clear pool
- `BalanceAlgorithmSetup` - Save/reset/error
- `AppConfig` - Reset section
- `MobileHeader` - Logout (mobile)
- `MatchListPage` - Delete match
- `SeasonDeleteModal` - Wrapper component
- `SingleBlockedModal` - Wrapper component

### Custom Form Modals (5 files)

- `PlayerFormModal` - Add/edit player (name, phone, 6 sliders)
- `SeasonFormModal` - Create season (start/end dates)
- `MatchModal` - Create match (date, team size)
- `BalanceOptionsModal` - Select balance algorithm (radio buttons)
- `PendingJoinRequests` - Approve join request (text input)

### Marketing/Special (3 files)

- `AppPromoModal` - Post-login app download
- `ComingSoonModal` - Marketing page feature
- `AttributeGuide` - Player attribute help

---

## Creating a New Modal

**Checklist:**

1. **[ ] Determine type:**
   - Simple confirmation? → SoftUIConfirmationModal
   - Form with inputs? → Custom mobile-safe pattern
   - Unique marketing? → Custom (document here)

2. **[ ] Follow standards:**
   - Use SVG icons (never emojis)
   - Use gradient buttons (purple-pink primary)
   - Test on mobile (with keyboard if has inputs)
   - Add `role="dialog"` + `aria-modal="true"`

3. **[ ] Mobile testing (if has inputs):**
   - Open modal on mobile device
   - Tap input field
   - Keyboard appears
   - Verify: Modal fits, buttons accessible, no off-screen shift
   - Close modal
   - Verify: Page formatting normal

4. **[ ] Add to inventory:**
   - Update this spec's inventory table
   - Document any unique patterns

---

**Document Status:** ✅ Standards Active  
**Last Updated:** November 26, 2025  
**Version:** 1.0.0

**For examples:** See components listed in inventory  
**For SweetAlert2 wrapper:** See `src/components/ui-kit/SoftUIConfirmationModal.component.tsx`
