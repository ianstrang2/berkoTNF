# Player Settings Specification

**Last Updated:** November 2025  
**Status:** Ready for Implementation  
**Complexity:** Low-Medium  
**Estimated Effort:** 8-10 hours

---

## Overview

Players need the ability to update their basic profile information (name, email, selected club). This spec defines a Settings page accessible from the navigation hamburger menu, using the existing secondary navigation pattern to organize future settings categories.

---

## 🎨 UI Reuse Policy - NO NEW PATTERNS

**CRITICAL:** This feature uses **100% existing UI components and patterns**. No new UI will be created.

### Components to Reuse (Direct Imports)

| Component | Source | Usage |
|-----------|--------|-------|
| **NavigationSubTabs** | Already used in `/player/table` and `/player/records` | Secondary tab navigation |
| **ClubSelector** | `src/components/admin/player/ClubSelector.component.tsx` | Club selection dropdown |

### Patterns to Copy-Paste (Exact Styles)

| Pattern | Source File | Line(s) | What to Copy |
|---------|-------------|---------|--------------|
| **Input fields** | `PlayerFormModal.component.tsx` | 220 | `className="w-full px-3 py-2 border border-gray-300..."` |
| **Character counter** | `PlayerFormModal.component.tsx` | 214 | `<span className="text-xs text-slate-500">{length} / 14</span>` |
| **Error display** | `PlayerFormModal.component.tsx` | 225-227 | `<p className="text-xs text-red-500 mt-1">{error}</p>` |
| **Success toast** | `MatchSettingsSetup.component.tsx` | 208-212 | `<div className="mb-4 p-3 rounded-md bg-green-50 text-green-700">` |
| **Gradient button** | `PlayerFormModal.component.tsx` | 474-479 | Full gradient button classes |
| **Loading state** | `PlayerFormModal.component.tsx` | 480-483 | `{isProcessing ? 'Processing...' : 'Save Changes'}` |

### Verification Checklist

Before implementation, confirm:
- [ ] NavigationSubTabs component exists and is importable
- [ ] ClubSelector component exists at specified path
- [ ] All className strings copied verbatim (no modifications)
- [ ] No new color/spacing/font classes added
- [ ] No new UI components created
- [ ] Gradient button uses exact existing classes

---

## Navigation Structure

### Desktop
- **Sidebar**: Add "Settings" as 5th item (after Dashboard, Upcoming, Table, Records)
- **Icon**: Gear/cog SVG (consistent with other nav icons)
- **Route**: `/player/settings` (defaults to Profile tab)

### Mobile
- **Bottom Nav**: Keep existing 4 items (Dashboard, Upcoming, Table, Records) - NO settings here
- **Hamburger Menu**: Add "Settings" as first item (above view switching and logout)
- **Route**: Same `/player/settings`
- **Behavior**: When in settings, bottom nav remains visible for easy navigation back to other sections

### Current Hamburger Menu Structure
```
⚙️ Settings          ← NEW (first item)
───────────
[View Switching]     (only if admin with linkedPlayerId)
🚪 Logout
```

---

## Page Structure

### Route: `/player/settings`

**Layout**: Use existing secondary nav pattern (same as `/player/table`)

**Secondary Tabs** (horizontal tabs at top):
1. **Profile** (active, implemented)
2. **Security** (implemented, placeholder content)
3. **Notifications** (disabled, placeholder)
4. **Billing** (disabled, placeholder)

**Disabled tab pattern:**
```tsx
<button
  disabled={true}
  aria-disabled="true"
  className="opacity-50 cursor-not-allowed"
  onClick={(e) => e.preventDefault()}
>
  Security
  <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
    Coming Soon
  </span>
</button>
```

**Visual Pattern**: Copy from `NavigationSubTabs.component.tsx` used in table pages

---

## Profile Tab (MVP - Implement First)

### Editable Fields

**1. Player Name**
- Input: Text field
- Max length: 14 characters
- Validation: Required, unique per tenant
- Show character count: `{length} / 14`
- Error: "This name is already taken" (if duplicate)

**2. Email Address**
- Input: Email field
- Validation: Optional, valid email format if provided
- Placeholder: "player@email.com"

**3. Selected Club**
- Input: ClubSelector component (reuse from `PlayerFormModal.component.tsx`)
- Features:
  - Search football clubs
  - Click outside to close dropdown
  - X button to clear selection
  - Shows club badge + name
- Optional field

### API Endpoint

**Route**: `PUT /api/player/profile`

**Request Body**:
```typescript
{
  name: string;          // required, 14 char max
  email?: string | null; // optional
  club?: Club | null;    // optional, Club type from player.types.ts
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: PlayerProfile;
  error?: string;
}
```

**Authorization**: `requirePlayerAccess(request)`

**Validation**:
1. **Name uniqueness**: Check `players` table for duplicate name within tenant **EXCLUDING current player**
   ```typescript
   const existingPlayer = await prisma.players.findFirst({
     where: {
       name: data.name,
       tenant_id: tenantId,
       NOT: { player_id: player.player_id }  // Essential - don't block their own name
     }
   });
   ```
2. **Name length**: Max 14 characters (allow existing >14 char names to remain - grandfathered)
3. **Email format**: HTML5 email validation (if provided)
4. **Tenant isolation**: Validated via `requirePlayerAccess()` which returns player with tenant_id

**Database Update**:
```typescript
// player_id is primary key, already validated via requirePlayerAccess()
await prisma.players.update({
  where: { 
    player_id: player.player_id  // Primary key - sufficient for WHERE clause
  },
  data: {
    name: data.name.trim(),
    email: data.email?.trim() || null,       // Empty string → null
    selected_club: data.club || null         // Club object or null (stored as JSON)
  }
});
```

**Note on selected_club**: 
- DB column type: `Json?` (stores full Club object: `{ name, filename }`)
- No club IDs - clubs come from static football club JSON search
- This pattern already works in admin player modal

### UI Component

**File**: `src/components/player/ProfileSettings.component.tsx`

**Pattern**: Reuse PlayerFormModal form structure but as inline page (not modal)

**Behavior**:
- Form with 3 fields (name, email, club)
- "Save Changes" button (gradient, bottom-right)
- Success toast on save: "Profile updated!"
- Error display: Red text below field (same as admin modal)
- Loading state: 
  - Disable ALL inputs (including ClubSelector)
  - Button shows "Saving..." with spinner
  - Prevent double-submit

**Analytics events** (using Plausible custom events):
```typescript
// On mount
plausible('Settings Opened', { props: { tab: 'profile' } });

// On save success
plausible('Settings Saved', { 
  props: { fields: ['name', 'email'].join(',') }
});

// On error
plausible('Settings Error', { 
  props: { error_type: 'name_duplicate' }
});
```

**Mobile Considerations**:
- Full-width form on mobile
- Keyboard-safe (doesn't break with mobile keyboard)
- Touch-friendly inputs (min 44px height)

---

## Security Tab (Placeholder - Future)

### Current Implementation (Placeholder)

**Display**:
- Show current phone (read-only, masked: `+XX *** *** 123`)
- Heading: "Phone Number"
- Subtext: "Your phone number is used for authentication via SMS"
- Info box: "📱 To update your phone number, please contact an admin. This requires verification to maintain account security."

**Phone masking (generic for all countries):**
```typescript
const maskedPhone = player.phone
  ? `${player.phone.slice(0, 3)} *** *** ${player.phone.slice(-3)}`
  : 'Not set';
// Examples:
// +447123456789 → +44 *** *** 789
// +15551234567  → +15 *** *** 567
```

**Future Enhancement** (when prioritized):
- "Change Phone Number" button
- Two-step verification flow (see `FUTURE_PROBLEMS.md` for full flow)
- Force logout all sessions after change
- Effort: 6-8 hours

---

## Notifications Tab (Placeholder - Future)

**Status**: Disabled, shows "Coming Soon" badge

**Future Features** (when RSVP implemented):
- Email notifications on/off
- RSVP reminders
- Match results notifications
- Admin announcements

**Reference**: See `docs/SPEC_RSVP.md` when implementing

---

## Referrals Tab (Placeholder - Future)

**Status**: Disabled, shows "Coming Soon" badge

**Future Features** (when marketing/growth phase):
- Personal referral link
- Referral history
- Rewards/incentives tracking

---

## Billing Tab (Placeholder - Future)

**Status**: Disabled, shows "Coming Soon" badge

**Future Features** (when payments implemented):
- Payment history
- Upcoming charges
- Payment method management
- Invoices/receipts

---

## Implementation Checklist

### Phase 1: Basic Profile Settings (MVP)

**Navigation**:
- [ ] Add Settings icon to DesktopSidebar.component.tsx (5th item)
- [ ] Add Settings to MobileHeader hamburger menu (first item, above logout)
- [ ] Update NavigationContext to handle `/player/settings` route
- [ ] Test navigation from both desktop and mobile

**Settings Page**:
- [ ] Create `/src/app/player/settings/page.tsx`
- [ ] **REUSE:** Import `NavigationSubTabs` (same as table/records pages)
- [ ] Add secondary tab navigation (Profile, Security, Notifications, Referrals, Billing)
- [ ] Disable all tabs except Profile (add disabled state + "Coming Soon" badge)
- [ ] Create `ProfileSettings.component.tsx` with form

**Profile Form**:
- [ ] **COPY:** Name field styles from `PlayerFormModal.component.tsx` line 220
- [ ] **COPY:** Character counter from `PlayerFormModal.component.tsx` line 214
- [ ] **COPY:** Email field styles (same input classes as name)
- [ ] **REUSE:** Import `ClubSelector` from admin/player folder (no modifications)
- [ ] **COPY:** Gradient button from `PlayerFormModal.component.tsx` line 474-479
- [ ] **COPY:** Error display from `PlayerFormModal.component.tsx` line 225-227
- [ ] **COPY:** Toast pattern from `MatchSettingsSetup.component.tsx` line 208-212

**API**:
- [ ] Create `PUT /api/player/profile/route.ts`
- [ ] Add `requirePlayerAccess()` authorization
- [ ] Validate name uniqueness within tenant
- [ ] Validate email format (if provided)
- [ ] Update database with `withTenantFilter()`
- [ ] Return updated player profile
- [ ] Test with React Query mutation

**Security Tab (Placeholder)**:
- [ ] Create placeholder with phone display (masked)
- [ ] Add "Contact admin" message
- [ ] Explanatory text about security

**Testing**:
- [ ] Desktop: Navigate to settings, update profile
- [ ] Mobile: Navigate to settings, update profile
- [ ] Validation: Duplicate name error (different player)
- [ ] Validation: Same name allowed (own name unchanged)
- [ ] Validation: Email format error
- [ ] Validation: Name max length (new names only)
- [ ] Validation: Existing >14 char names allowed (grandfathered)
- [ ] Club selector: Search, select, clear
- [ ] Success: Toast appears, data persists
- [ ] Navigation: Bottom nav still works from settings page
- [ ] Edge case: Offline/slow network shows clear error
- [ ] Edge case: Race condition (two users same name) - DB constraint catches it
- [ ] Edge case: iPhone SE - keyboard doesn't cover Save button
- [ ] Edge case: Clearing email/club sets to null correctly

---

## Design Notes

### Component Source Map

**Every UI element maps to existing code:**

```typescript
// Settings page layout
import { NavigationSubTabs } from '@/components/navigation/NavigationSubTabs.component';

// Profile form
import ClubSelector from '@/components/admin/player/ClubSelector.component';

// Styles - COPY-PASTE from PlayerFormModal.component.tsx:
// - Input: line 220
// - Counter: line 214  
// - Error: line 225-227
// - Button: line 474-479

// Toast - COPY-PASTE from MatchSettingsSetup.component.tsx:
// - Toast state: line 34
// - Toast display: line 208-212
```

**NO new components**
**NO new Tailwind classes**
**NO new design patterns**

### Mobile-First Considerations

**Form Layout**:
- Full-width inputs on mobile (< 640px)
- Stacked layout (no side-by-side)
- Adequate spacing between fields (16px)

**ClubSelector**:
- Touch-friendly dropdown (min 44px items)
- Close on outside tap (mobile-friendly)
- Search input works with mobile keyboard

**Navigation**:
- Secondary tabs scroll horizontally if needed
- Active tab always visible
- Bottom nav remains accessible (not hidden by keyboard)

---

## Future Considerations

### When to Expand

**Security Tab** (phone changes):
- Wait for user requests (track in support tickets)
- Priority: Low → Medium when requests > 5/month

**Notifications Tab** (RSVP preferences):
- Implement alongside RSVP feature (see `SPEC_RSVP.md`)
- Priority: High when RSVP launches

**Referrals Tab** (invite links):
- Implement during growth/marketing phase
- Priority: Medium when focusing on acquisition

**Billing Tab** (payment history):
- Implement alongside payment system
- Priority: High when payments launch

### Analytics to Track

- **Usage**: How many players visit settings?
- **Updates**: How many actually change name/email/club?
- **Errors**: What validation errors occur most?
- **Support Requests**: Phone change requests (triggers Security tab priority)

---

## Key Decisions

1. **Mobile Nav**: Settings in hamburger only (not bottom nav) - keeps nav clean, settings are infrequent access
2. **Phone Changes**: Deferred to contact-admin flow - rare, complex, wait for user demand
3. **Tab Structure**: All future tabs visible (disabled) - sets expectations, shows roadmap
4. **API Pattern**: Single PUT endpoint for profile - simpler than field-by-field updates
5. **Validation**: Reuse admin modal validation - consistency, already tested

---

## Risk Mitigation

**Duplicate Name Validation**:
- Risk: Race condition (two users submit same name simultaneously)
- Mitigation: Database unique constraint `unique_player_name_per_tenant` catches it
- Fallback: API returns clear error message

**Phone Display Security**:
- Risk: Exposing full phone number
- Mitigation: Mask display (`+44 7XXX XXXXXX` instead of full number)
- Note: Player already knows their own number, masking is UX convention

**Navigation Confusion**:
- Risk: Users get lost in settings (too many tabs)
- Mitigation: Only Profile tab enabled initially, clear tab labels
- Fallback: Bottom nav always visible for escape route

---

## Success Metrics

**MVP Launch**:
- [ ] 80%+ of players can successfully update their name
- [ ] Zero support tickets about "can't find settings"
- [ ] < 5% duplicate name errors
- [ ] Mobile form works on iPhone SE and smaller

**Long-term**:
- 20%+ of players update profile within first week
- < 1% support tickets about settings
- Future tabs get enabled based on user demand tracking

