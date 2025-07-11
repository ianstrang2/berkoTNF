# Navigation Refactor Specification

## Overview & Goals

### Current State
- Desktop-focused sidebar navigation
- Single-tier navigation with some secondary options
- Next.js 14 App Router with TypeScript
- Tailwind CSS + Soft UI Dashboard theme
- React Context for navigation state

### Target State
- **Mobile-first design** with bottom navigation (4 primary options)
- **Desktop responsive** with sidebar + horizontal tabs
- **Three-tier navigation hierarchy** with clear visual distinction
- **Admin mode switching** with separate navigation context
- **Capacitor-ready** for mobile app deployment

### Core Principles
- Maintain existing Soft UI Dashboard styling
- Preserve all current functionality
- Clean, intuitive URL structure
- Responsive design (mobile < 768px, tablet 768-1024px uses mobile nav, desktop > 1024px)

---

## Navigation Architecture

### Primary Navigation (Tier 1)
- **Dashboard** - Overview/summary page
- **Upcoming** - Fixture information  
- **Table** - Current season standings (renamed from "2025")
- **Records** - Historical statistics (renamed from "All-Time")
- **Admin** - Administrative functions (role-gated)

### Secondary Navigation (Tier 2)
- **Table**: Half, Whole
- **Records**: Leaderboard, Legends, Feats
- **Admin**: Matches, Players, Info, Setup

### Tertiary Navigation (Tier 3)
- **Table > Half**: Points, Goals (UI state toggle - same page, different tables)
- **Table > Whole**: Points, Goals (UI state toggle - same page, different tables)
- **Records > Legends**: Points, Goals (UI state toggle - same page, different tables)
- **Admin > Matches**: Next Match, Results
- **Admin > Players**: Add/Edit, Ratings
- **Admin > Setup**: 5 configuration options (existing structure)

**Important**: Points/Goals tertiary options are UI state within components, NOT separate routes.

---

## URL Structure Changes

### Current → New URL Mapping

#### User Navigation
```
Current                    → New
/                         → / (Dashboard)
/season/half-season       → /table/half
/season/full-season       → /table/whole
/season/comparison        → /table/whole (deprecate)
/records/players          → /records/leaderboard
/records/all-time         → /records/leaderboard
/records/hall-of-fame     → /records/legends
/records/feats            → /records/feats
/matchday/                → /upcoming
```

**Note**: No URL redirects needed - old URLs will simply break.

#### Admin Navigation
```
Current                   → New
/admin/next-match        → /admin/matches/next
/admin/players           → /admin/players/add-edit
/admin/matches           → /admin/matches/results
/admin/info              → /admin/info
/admin/ratings           → /admin/players/ratings
/admin/setup             → /admin/setup
```

### Route Structure
```
src/app/
├── page.tsx (Dashboard)
├── upcoming/
│   └── page.tsx (NEW - fixture information)
├── table/
│   ├── half/
│   │   └── page.tsx (Points/Goals toggle within component)
│   └── whole/
│       └── page.tsx (Points/Goals toggle within component)
├── records/
│   ├── leaderboard/page.tsx
│   ├── legends/
│   │   └── page.tsx (Points/Goals toggle within component)
│   └── feats/page.tsx
└── admin/
    ├── matches/
    │   ├── next/page.tsx
    │   └── results/page.tsx
    ├── players/
    │   ├── add-edit/page.tsx
    │   └── ratings/page.tsx
    ├── info/page.tsx
    └── setup/page.tsx
```

---

## Technical Implementation

### 1. State Management Updates

#### Enhanced NavigationContext
```typescript
interface NavigationState {
  // Navigation state
  primarySection: 'dashboard' | 'upcoming' | 'table' | 'records' | 'admin';
  secondarySection?: string;
  // Note: No tertiarySection - Points/Goals handled by individual components
  // Note: No pointsGoalsPreference - each page manages its own state independently
  
  // UI state  
  isMobile: boolean;
  sidebarCollapsed: boolean;
  
  // Admin state
  isAdminMode: boolean;
  isAdminAuthenticated: boolean;
  lastVisitedAdminSection?: string; // For better UX when returning to admin mode
}

interface NavigationContextType extends NavigationState {
  // Actions
  setPrimarySection: (section: NavigationState['primarySection']) => void;
  setSecondarySection: (section: string | undefined) => void;
  toggleAdminMode: () => void;
  setNavigationFromUrl: (pathname: string) => void;
  
  // Computed values
  availableSecondaryOptions: string[];
  
  // Utilities
  isAdminUrl: (pathname: string) => boolean;
  requiresAuthentication: (pathname: string) => boolean;
}
```

#### Navigation Configuration
```typescript
const NAVIGATION_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: 'dashboard',
    secondary: null
  },
  upcoming: {
    label: 'Upcoming', 
    icon: 'calendar',
    secondary: null
  },
  table: {
    label: 'Table',
    icon: 'table',
    secondary: {
      half: { label: 'Half' },
      whole: { label: 'Whole' }
    }
  },
  records: {
    label: 'Records',
    icon: 'trophy', 
    secondary: {
      leaderboard: { label: 'Leaderboard' },
      legends: { label: 'Legends' },
      feats: { label: 'Feats' }
    }
  },
  admin: {
    label: 'Admin',
    icon: 'settings',
    secondary: {
      matches: { label: 'Matches', tertiary: ['next', 'results'] },
      players: { label: 'Players', tertiary: ['add-edit', 'ratings'] },
      info: { label: 'Info' },
      setup: { label: 'Setup', hasSections: true } // Single page with 5 internal sections
    }
  }
};

// Note: Points/Goals toggles are handled within individual page components, not in navigation config
// Admin setup sections are handled within the setup page component, not as routes
```

### 2. Component Architecture

#### New Components to Create
```
src/components/navigation/
├── BottomNavigation.tsx          # Mobile bottom nav with complete admin replacement (Matches|Players|Info|Setup)
├── DesktopSidebar.tsx           # Desktop left sidebar (primary navigation)  
├── NavigationTabs.tsx           # Secondary navigation tabs (desktop top)
├── AdminModeToggle.tsx          # Admin/user mode switcher for header (top-right placement)
├── NavigationProvider.tsx       # Enhanced context provider with admin state persistence
└── PointsGoalsToggle.tsx        # Simple component for Points/Goals switches (no persistence)
```

**Note**: Replace any existing `BottomNav.component.tsx` with new `BottomNavigation.tsx` using Soft UI styling from `/soft-ui` directory.
**Points/Goals Implementation**: Each page manages its own toggle state independently - always defaults to "Points", no cross-page persistence.

#### Layout Component Updates
```
src/components/layout/
├── MainLayout.component.tsx     # Updated with new responsive navigation
├── AdminLayout.component.tsx    # Enhanced admin protection
└── ResponsiveNavigation.tsx     # Navigation orchestration component
```

### 3. Mobile Navigation (Bottom Bar)

#### Design Specifications
- **Position**: Fixed bottom, full width
- **Height**: 64px (16 Tailwind units)
- **Items**: 4 primary navigation options
- **Active State**: Icon + label with accent color
- **Inactive State**: Icon only with muted color
- **Safe Area**: Account for iOS home indicator

#### Component Structure
```tsx
<BottomNavigation>
  <NavItem 
    section="dashboard" 
    icon={<DashboardIcon />} 
    label="Dashboard"
    active={primarySection === 'dashboard'}
  />
  {/* ... other nav items */}
</BottomNavigation>
```

### 4. Desktop Navigation

#### Sidebar (Primary Navigation)
- **Position**: Fixed left, collapsible
- **Width**: 240px expanded, 64px collapsed
- **Items**: Same 4 primary options + admin toggle
- **Behavior**: Auto-collapse on tablet, manual toggle on desktop

#### Top Tabs (Secondary Navigation)  
- **Position**: Below header, above content
- **Style**: Horizontal tabs with underline active state
- **Visibility**: Only show when secondary options exist
- **Responsive**: Stack vertically on narrow screens

#### Sub-tabs (Tertiary Navigation)
- **Position**: Below secondary tabs  
- **Style**: Smaller pills or minimal tabs
- **Visibility**: Only show when tertiary options exist
- **Behavior**: For Points/Goals - these are UI state toggles within components, NOT route changes
- **Implementation**: Component-level state, not navigation context

### 5. Admin Mode Implementation

#### Admin Toggle Location
- **Desktop**: Header top-right, next to user profile area
- **Mobile**: Header top-right, minimal toggle switch
- **Visual Indicator**: Different header background when in admin mode

#### Admin Navigation Behavior
- **Complete Replacement**: Admin mode shows only admin navigation options
- **URL Persistence**: Admin URLs remain accessible with direct links
- **Authentication**: Redirect to login if not authenticated for admin routes
- **Visual Distinction**: Different color scheme/accent for admin mode

#### Implementation
```tsx
<AdminModeToggle 
  isAdminMode={isAdminMode}
  isAuthenticated={isAdminAuthenticated}
  onToggle={toggleAdminMode}
/>
```

---

## Responsive Behavior

### Breakpoints
- **Mobile**: < 768px (md) - Bottom navigation
- **Tablet**: 768px - 1024px (md-lg) - Bottom navigation (touch-friendly for Capacitor)
- **Desktop**: > 1024px (lg+) - Sidebar + tabs navigation

### Navigation Transitions
- **Smooth transitions** between mobile/desktop layouts
- **State preservation** when resizing browser
- **Graceful degradation** if JavaScript disabled

### Capacitor Considerations
- **Safe areas** for iOS notch/home indicator
- **Touch targets** minimum 44px for mobile
- **Native feel** with appropriate animations and feedback

---

## Migration Strategy

### Phase 1: Foundation
- [ ] Update NavigationContext with new state structure
- [ ] Create navigation configuration object
- [ ] Set up new URL routing structure
- [ ] Create URL parsing/navigation sync utilities

### Phase 2: Mobile Components
- [ ] Build BottomNavigation component
- [ ] Implement responsive detection logic  
- [ ] Add mobile navigation to MainLayout
- [ ] Test mobile navigation flow

### Phase 3: Desktop Components  
- [ ] Build new DesktopSidebar component
- [ ] Create NavigationTabs component
- [ ] Add NavigationSubTabs component
- [ ] Integrate with MainLayout

### Phase 4: Admin Mode
- [ ] Create AdminModeToggle component
- [ ] Implement admin navigation switching
- [ ] Update AdminLayout component
- [ ] Test admin mode transitions

### Phase 5: Migration & Cleanup
- [ ] Update all page components to use new navigation
- [ ] Migrate existing route handlers
- [ ] Remove legacy Sidebar.jsx
- [ ] Update any navigation-dependent components

### Phase 6: Polish & Testing
- [ ] Add animations and transitions
- [ ] Test responsive behavior
- [ ] Verify all routes work correctly
- [ ] Test admin authentication flow
- [ ] Cross-browser testing

---

## Component Integration

### MainLayout Updates
```tsx
function MainLayout({ children }: { children: ReactNode }) {
  const { isMobile, isAdminMode } = useNavigation();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with admin toggle */}
      <Header />
      
      {/* Navigation */}
      {isMobile ? (
        <>
          {/* Content with bottom padding for nav */}
          <main className="pb-16">
            {children}
          </main>
          <BottomNavigation />
        </>
      ) : (
        <div className="flex">
          <DesktopSidebar />
          <div className="flex-1">
            <NavigationTabs />
            <NavigationSubTabs />
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
```

### URL Synchronization
```typescript
// Utility to sync navigation state with URL
function useNavigationSync() {
  const { setNavigationFromUrl } = useNavigation();
  const pathname = usePathname();
  
  useEffect(() => {
    setNavigationFromUrl(pathname);
  }, [pathname, setNavigationFromUrl]);
}
```

---

## Testing Checklist

### Functionality Testing
- [ ] All navigation options work correctly
- [ ] Deep linking sets correct navigation state  
- [ ] Browser back/forward works properly
- [ ] Admin mode toggle functions correctly
- [ ] Mobile/desktop responsive switching
- [ ] All existing pages still accessible

### User Experience Testing
- [ ] Navigation is intuitive and discoverable
- [ ] Active states clearly indicate current location
- [ ] Smooth transitions between sections
- [ ] Touch targets appropriate size on mobile
- [ ] Admin mode visually distinct

### Technical Testing  
- [ ] No broken routes or 404 errors
- [ ] Navigation state persists on refresh
- [ ] Performance acceptable on slower devices
- [ ] Accessibility standards met
- [ ] Works in all target browsers

### Edge Cases
- [ ] Direct links to nested pages work
- [ ] Invalid URLs handled gracefully  
- [ ] Admin routes protected correctly
- [ ] Mobile landscape orientation
- [ ] Very narrow mobile screens
- [ ] Large desktop screens

---

## Implementation Notes

### State Persistence Strategy
- **Navigation State**: Use sessionStorage for current session navigation state
- **Admin Mode**: Use localStorage to persist admin mode across sessions
- **Points/Goals Preference**: Use localStorage for global preference across all sections
- **Deep Link Behavior**: Smart detection - if accessing admin URL while authenticated, auto-enable admin mode

### Authentication Integration
- **Current System**: Keep simple localStorage-based auth with hardcoded password for now
- **Admin Detection**: Check `localStorage.getItem('adminAuth')` for authentication
- **URL Protection**: Admin routes redirect to login if not authenticated
- **Smart Mode Switching**: Accessing admin URLs auto-enables admin mode when authenticated

### Component Replacement Strategy
- **Legacy Components**: Remove `Sidebar.jsx` and any existing `BottomNav.component.tsx`
- **New Components**: Build completely new navigation components using Soft UI patterns
- **Styling Source**: Reference `/soft-ui` directory for consistent styling patterns
- **Integration**: Update MainLayout.component.tsx to use new navigation system

### Styling Approach
- Use existing Tailwind classes and **Soft UI Dashboard theme from `/soft-ui` directory**
- Replace any legacy navigation components with new ones following Soft UI patterns
- Maintain current color palette with **admin mode visual distinction**:
  - **User Mode**: Current primary colors and styling
  - **Admin Mode**: Darker header (slate/deep blue), subtle accent changes, "ADMIN" badge
- Add minimal new CSS for navigation-specific needs
- Ensure consistency between mobile and desktop navigation using Soft UI components

### Performance Considerations
- Lazy load navigation components when possible
- Minimize re-renders when navigation state changes
- Use React.memo for pure navigation components
- Consider virtualizing long lists in admin sections

### Accessibility
- Ensure keyboard navigation works throughout
- Add appropriate ARIA labels and roles
- Maintain focus management when switching modes
- Test with screen readers

### Future Considerations
- Navigation could be made configurable/dynamic
- Consider animations/transitions for enhanced UX
- May need to add user role management beyond admin/user
- Consider PWA features for Capacitor deployment

---

## Success Criteria

The refactor will be considered successful when:

1. **Mobile Experience**: Clean, intuitive bottom navigation that works well on touch devices
2. **Desktop Experience**: Efficient sidebar + tabs navigation that utilizes screen space well
3. **Admin Functionality**: Seamless switching between user and admin modes
4. **URL Structure**: Clean, bookmarkable URLs that reflect navigation hierarchy  
5. **Responsive Design**: Smooth transitions between mobile and desktop layouts
6. **No Regressions**: All existing functionality preserved and working
7. **Performance**: Navigation feels fast and responsive across all devices
8. **Capacitor Ready**: Mobile navigation optimized for native app deployment

---

*This specification should be treated as a living document. Update sections as implementation progresses and requirements evolve.*