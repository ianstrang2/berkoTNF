# 🛠 Match CRUD UI Enhancement Plan

## 📋 Overview

The Match Control Centre (MCC) lifecycle system is fully implemented, but critical UI components for match management are missing. Users cannot:

1. **Create new matches** from the upcoming matches list
2. **Edit match metadata** (date, team size) in existing matches  
3. **Delete/Cancel matches** before completion

**Root Cause:** API endpoints exist (`POST`, `PUT`, `DELETE /api/admin/upcoming-matches`) but the UI components to trigger them are missing.

### **Related Documentation**
- **Main System Architecture**: See `match-control-centre.md` for complete MCC system documentation including database schema, API routes, and component architecture
- **Dashboard Implementation**: See `match-report.md` for dashboard reorganization and feat-breaking detection system

---

## 🧠 **Architectural Analysis Results**

### ✅ **API Patterns Discovered**
- **PUT** for updates (takes `upcoming_match_id` in request body)
- **DELETE** for removal (takes `id` as query parameter)  
- **Hard deletion** pattern (no soft-delete/cancellation)
- **`state_version`** fully implemented for lifecycle transitions, but missing from main PUT handler

### ✅ **Component Reuse Opportunities**
- **`MatchModal.component.tsx`** already exists and is perfect for both create/edit operations
- **Copy button success pattern** established: `setCopySuccess(true)` → `setTimeout(() => setCopySuccess(false), 2000)`
- **Existing confirmation dialogs** available for delete operations

### ✅ **Design Patterns**
- Success flash states using gradient and text change
- `useMatchState` already handles `state_version` concurrency
- Consistent button variants and shadows throughout

---

## ✅ Current Implementation Status

### ✅ **What Works**
- Match Control Centre at `/admin/matches/[id]` with full lifecycle (Draft → PoolLocked → TeamsBalanced → Completed)
- Match list page at `/admin/matches` showing upcoming and historical matches
- `useMatchState` hook with toast notifications and `state_version` handling
- API endpoints for all CRUD operations
- **Perfect reusable components**: `MatchModal`, `ConfirmationDialog`, `Button`, etc.

### ❌ **What's Missing**
- "Create New Match" button and integration with existing `MatchModal`
- "Edit Match" option in MCC dropdown menu using existing `MatchModal`
- "Delete Match" option in MCC dropdown menu using existing confirmation pattern
- `state_version` check in PUT handler for concurrency safety

---

## 🎯 Updated Implementation Plan

### 🟢 **Task 1: Add state_version to PUT API Handler**

**File:** `src/app/api/admin/upcoming-matches/route.ts`

**Why:** Maintain concurrency protection across all operations

**Changes:**
```tsx
// In PUT method, add state_version check
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, upcoming_match_id, state_version, match_date, team_size, is_balanced, is_active } = body;
    
    // ... existing ID validation ...

    // Get current match
    const currentMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: targetMatchId },
      include: { _count: { select: { players: true } } }
    });

    if (!currentMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Add state_version concurrency check
    if (typeof state_version === 'number' && currentMatch.state_version !== state_version) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }

    // ... existing team size validation ...

    // Update match with state_version increment
    const updatedMatch = await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: {
        match_date: match_date ? new Date(match_date) : undefined,
        team_size: team_size,
        is_balanced: is_balanced !== undefined ? is_balanced : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
        state_version: { increment: 1 }
      }
    });

    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
    console.error('Error updating upcoming match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

### 🟢 **Task 2: Add "New Match" Button to Matches List**

**File:** `src/app/admin/matches/page.tsx`

**Changes:** Add FAB and desktop button that use existing `MatchModal`

**Implementation:**
```tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MatchModal from '@/components/team/modals/MatchModal.component';
import { nextThursday, format } from 'date-fns';

// Add state
const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
const [isCreating, setIsCreating] = useState(false);
const [createError, setCreateError] = useState<string | null>(null);
const router = useRouter();

// Add match data state
const [newMatchData, setNewMatchData] = useState({
  date: format(nextThursday(new Date()), 'yyyy-MM-dd'),
  team_size: 9
});

// Add create handler
const handleCreateMatch = async () => {
  setIsCreating(true);
  setCreateError(null);
  
  try {
    const response = await fetch('/api/admin/upcoming-matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_date: newMatchData.date,
        team_size: newMatchData.team_size
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create match');
    }

    // Close modal and redirect
    setIsNewMatchModalOpen(false);
    router.push(`/admin/matches/${result.data.upcoming_match_id}`);
  } catch (err: any) {
    setCreateError(err.message);
  } finally {
    setIsCreating(false);
  }
};

// Update renderUpcomingList to include buttons
const renderUpcomingList = () => (
  <div className="space-y-4 max-w-3xl">
    {/* Header with Create button for desktop */}
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-slate-800">Upcoming Matches</h2>
      <Button 
        onClick={() => setIsNewMatchModalOpen(true)}
        variant="primary"
        className="hidden md:flex bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md"
      >
        + New Match
      </Button>
    </div>
    
    {/* Existing match list */}
    {upcoming.map(match => (/* existing code */))}
    
    {/* Mobile FAB */}
    <Button
      onClick={() => setIsNewMatchModalOpen(true)}
      variant="primary" 
      className="md:hidden fixed bottom-20 right-4 z-40 rounded-full w-14 h-14 shadow-soft-xl p-0 text-lg font-bold"
    >
      +
    </Button>
  </div>
);

// Add modal at bottom of component JSX
<MatchModal 
  isOpen={isNewMatchModalOpen}
  onClose={() => setIsNewMatchModalOpen(false)}
  data={newMatchData}
  onChange={(field, value) => setNewMatchData(prev => ({ ...prev, [field]: value }))}
  onSubmit={handleCreateMatch}
  isLoading={isCreating}
  error={createError}
  isEditing={false}
/>
```

---

### 🟢 **Task 3: Add Edit/Delete to MCC Dropdown**

**File:** `src/app/admin/matches/[id]/page.tsx`

**Changes:** Add options to existing 3-dot menu, use existing components

**Implementation:**
```tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2 } from 'lucide-react';
import MatchModal from '@/components/team/modals/MatchModal.component';
import ConfirmationDialog from '@/components/ui-kit/ConfirmationDialog.component';
import { format } from 'date-fns';

// Add states
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [isEditing, setIsEditing] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [editError, setEditError] = useState<string | null>(null);
const [editSuccess, setEditSuccess] = useState(false);
const router = useRouter();

// Add edit data state
const [editMatchData, setEditMatchData] = useState({
  date: '',
  team_size: 9
});

// Initialize edit data when modal opens
const openEditModal = () => {
  setEditMatchData({
    date: format(new Date(matchData.matchDate), 'yyyy-MM-dd'),
    team_size: matchData.teamSize
  });
  setEditModalOpen(true);
};

// Edit handler with success flash
const handleEditMatch = async () => {
  setIsEditing(true);
  setEditError(null);
  
  try {
    const response = await fetch('/api/admin/upcoming-matches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upcoming_match_id: matchData.upcoming_match_id,
        match_date: editMatchData.date,
        team_size: editMatchData.team_size,
        state_version: matchData.stateVersion
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update match');
    }

    // Success flash pattern (like copy button)
    setEditSuccess(true);
    setTimeout(() => setEditSuccess(false), 2000);
    
    setIsEditModalOpen(false);
    actions.revalidate(); // Refresh match data
  } catch (err: any) {
    setEditError(err.message);
  } finally {
    setIsEditing(false);
  }
};

// Delete handler
const handleDeleteMatch = async () => {
  setIsDeleting(true);
  
  try {
    const response = await fetch(`/api/admin/upcoming-matches?id=${matchData.upcoming_match_id}`, {
      method: 'DELETE'
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete match');
    }

    router.push('/admin/matches');
  } catch (err: any) {
    console.error('Delete failed:', err);
    setIsDeleting(false);
  }
};

// Update renderMoreMenu function
const renderMoreMenu = () => {
  const canEdit = matchData.state === 'Draft' || matchData.state === 'PoolLocked';
  
  if (!hasMoreActions && !canEdit) {
    return null;
  }

  return (
    <div className="relative">
      <Button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        variant={editSuccess ? "primary" : "outline"} 
        size="sm"
        className={editSuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : ""}
      >
        {editSuccess ? '✓' : <MoreVertical size={16} />}
      </Button>
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-soft-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-10 border border-gray-100">
          <div className="py-1" role="menu">
            {canEdit && (
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                openEditModal(); 
                setIsMenuOpen(false); 
              }} className="text-slate-700 hover:bg-gray-100 hover:text-slate-900 group flex items-center px-4 py-2 text-sm">
                <Edit className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Edit Match
              </a>
            )}
            {canEdit && (
              <a href="#" onClick={(e) => { 
                e.preventDefault(); 
                setIsDeleteModalOpen(true); 
                setIsMenuOpen(false); 
              }} className="text-red-600 hover:bg-red-50 hover:text-red-700 group flex items-center px-4 py-2 text-sm">
                <Trash2 className="mr-3 h-5 w-5" />
                Delete Match
              </a>
            )}
            {/* Existing unlock/undo options */}
            {can('unlockPool') && (
              <a href="#" onClick={(e) => { e.preventDefault(); actions.unlockPool(); setIsMenuOpen(false); }} className="text-slate-700 hover:bg-gray-100 hover:text-slate-900 group flex items-center px-4 py-2 text-sm">
                <Unlock className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Unlock Pool
              </a>
            )}
            {can('unlockTeams') && (
              <a href="#" onClick={(e) => { e.preventDefault(); actions.unlockTeams(); setIsMenuOpen(false); }} className="text-slate-700 hover:bg-gray-100 hover:text-slate-900 group flex items-center px-4 py-2 text-sm">
                <Lock className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Unlock Teams & Re-Balance
              </a>
            )}
            {can('undoComplete') && (
              <a href="#" onClick={(e) => { e.preventDefault(); actions.undoComplete(); setIsMenuOpen(false); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 group flex items-center px-4 py-2 text-sm">
                <RotateCcw className="mr-3 h-5 w-5" />
                Undo Completion
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Add modals before closing div
<MatchModal 
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  data={editMatchData}
  onChange={(field, value) => setEditMatchData(prev => ({ ...prev, [field]: value }))}
  onSubmit={handleEditMatch}
  isLoading={isEditing}
  error={editError}
  isEditing={true}
/>

<ConfirmationDialog
  isOpen={isDeleteModalOpen}
  onConfirm={handleDeleteMatch}
  onCancel={() => setIsDeleteModalOpen(false)}
  title="Delete Match"
  message={`Are you sure you want to delete this match on ${format(new Date(matchData.matchDate), 'EEEE, MMMM d, yyyy')}? ${matchData.players?.length || 0} players are assigned. This action cannot be undone.`}
  confirmText={isDeleting ? 'Deleting...' : 'Delete Match'}
  cancelText="Cancel"
  isConfirming={isDeleting}
/>
```

---

## 📱 Mobile Considerations

### **Floating Action Button (FAB)**
- **Position**: `fixed bottom-20 right-4` (above bottom nav)
- **Z-index**: `z-40` (below toast notifications)
- **Size**: `w-14 h-14` for thumb accessibility
- **Shape**: `rounded-full` with `+` icon
- **Padding**: `p-0` to center the + symbol

### **Success Flash States**
Following your existing copy button pattern:
```tsx
// State
const [editSuccess, setEditSuccess] = useState(false);

// In success handler
setEditSuccess(true);
setTimeout(() => setEditSuccess(false), 2000);

// In render
<Button
  variant={editSuccess ? "primary" : "outline"}
  className={editSuccess ? "bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md" : ""}
>
  {editSuccess ? '✓' : <MoreVertical size={16} />}
</Button>
```

---

## 🎨 Design System Compliance

### **Component Reuse**
- **MatchModal**: Already perfect for create/edit with `isEditing` prop
- **ConfirmationDialog**: Existing pattern for delete confirmations  
- **Button variants**: Following established `primary`, `secondary`, `outline`, `danger`
- **Success states**: Using existing copy button flash pattern

### **Colors & Gradients**
- **Primary buttons**: `bg-gradient-to-tl from-purple-700 to-pink-500`
- **Secondary buttons**: `text-neutral-700 bg-white border border-neutral-300`
- **Success flash**: Same gradient as primary
- **Error backgrounds**: `bg-red-50 border-l-4 border-red-500 text-red-700`

### **Shadows & Borders**
- **Modals**: `shadow-soft-xl` and `rounded-xl`
- **Cards**: `shadow-soft-xl border`
- **Dropdowns**: `shadow-soft-xl ring-1 ring-black ring-opacity-5`
- **FAB**: `shadow-soft-xl` for elevation

---

## 🔄 State Management & Error Handling

### **Concurrency Protection**
- **state_version**: Included in all edit operations
- **Conflict handling**: 409 errors show friendly messages
- **Auto-refresh**: `actions.revalidate()` after successful operations

### **Success Feedback**
- **Flash states**: 2-second visual feedback like copy buttons
- **Immediate feedback**: Button changes color and icon
- **Navigation**: Automatic redirect after create/delete operations

### **Error Handling**
- **Validation**: Client-side validation before API calls
- **Network errors**: Friendly error messages in modals
- **Loading states**: Buttons show "Creating...", "Saving...", "Deleting..."

---

## ✅ Testing Checklist

### **Create Match Flow**
- [ ] FAB appears on mobile, button on desktop
- [ ] Uses existing `MatchModal` with `isEditing={false}`
- [ ] Form validation works (required fields, valid dates)
- [ ] Success redirects to new match MCC
- [ ] Error handling shows in modal

### **Edit Match Flow**  
- [ ] "Edit Match" appears in dropdown for Draft/PoolLocked states
- [ ] Uses existing `MatchModal` with `isEditing={true}`
- [ ] Team size restrictions work when players assigned
- [ ] Success shows 2-second flash on 3-dot button
- [ ] `state_version` prevents concurrent edits

### **Delete Match Flow**
- [ ] "Delete Match" appears in dropdown for non-completed matches  
- [ ] Uses existing `ConfirmationDialog`
- [ ] Shows match details and player count in message
- [ ] Success redirects to matches list
- [ ] Hard deletion removes match entirely

### **Mobile Experience**
- [ ] FAB positioned correctly above bottom nav
- [ ] Existing `MatchModal` is responsive
- [ ] Touch targets are accessible (≥44px)
- [ ] Success flash states work on mobile

---

## 🚀 Implementation Priority

1. **High Priority**: Task 1 (API safety) + Task 2 (Create match)
2. **Medium Priority**: Task 3 (Edit/Delete functionality)

**Estimated Development Time**: 1-2 days total (reduced due to component reuse)

---

## 📋 Edge Cases Handled

### **Component Reuse Benefits**
- **Consistent validation**: `MatchModal` already handles date/team size validation
- **Error handling**: Existing patterns for loading states and error display
- **Responsive design**: `MatchModal` already works on all screen sizes
- **Form state**: Proper controlled input handling already implemented

### **Concurrency Safety**
- **state_version**: Now enforced across all edit operations
- **Optimistic updates**: UI shows success immediately, then refreshes
- **Conflict resolution**: Clear messaging when concurrent edits occur

### **Navigation Flow**
- **Create**: Redirect to new MCC 
- **Edit**: Stay in current MCC with refresh
- **Delete**: Return to matches list
- **Cancel**: No changes, modals close properly

---

**End of Updated Implementation Plan**