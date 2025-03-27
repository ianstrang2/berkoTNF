# PlayerPath Website Structure Documentation

## 1. Current Navigation Structure

### Main Dashboard Navigation
The application currently uses a card-based navigation system on the homepage (`src/app/page.js`). The flow works as follows:

1. **Home Dashboard**:
   - Users land on a homepage showing 7 colorful card options
   - Each card represents a different section of the application
   - Cards include icons and descriptions
   - State is managed via `currentView` state in the homepage component

2. **Navigation Flow**:
   - User clicks a card → sets `currentView` state → conditionally renders the selected component
   - Navigation back to the dashboard is through a "Back to Dashboard" button
   - There's no URL-based routing; all navigation is state-based

3. **Available Navigation Cards**:
   | Card Title | State Value | Component Rendered |
   |------------|-------------|-------------------|
   | Latest Match Report | `match-report` | `MatchReport` |
   | Current Half-Season | `current-half` | `CurrentHalfSeason` |
   | Performance by Season | `season` | `OverallSeasonPerformance` |
   | All-Time Leaderboard | `all-time` | `AllTimeStats` |
   | Hall of Fame | `honour-roll` | `HonourRoll` |
   | Player Profiles | `player-profiles` | `PlayerProfile` |
   | Admin Section | `admin` | `AdminPanel` wrapped in `AdminLayout` |

### Admin Dashboard Navigation
The Admin section uses a similar card-based approach for its dashboard:

1. **Admin Dashboard**:
   - Users see 5 card options for different admin functions
   - Cards are displayed after authentication
   - Navigation is also state-based using `currentSection` state

2. **Navigation Flow**:
   - User clicks a card → sets `currentSection` state → conditionally renders the selected component
   - Navigation back to the admin dashboard is through a "Back to Dashboard" button

3. **Available Admin Cards**:
   | Card Title | State Value | Component Rendered |
   |------------|-------------|-------------------|
   | Next Match Management | `algorithm` | `TeamAlgorithm` |
   | Player Ratings | `ratings` | `PlayerRatings` |
   | Player Management | `players` | `PlayerManager` |
   | Match Records | `matches` | `MatchManager` |
   | App Setup | `appsetup` | `ProtectedAppSetup` → `AppSetup` |

### Authentication Flow
1. **Admin Authentication**:
   - Access to admin features requires password authentication
   - On successful login, sets `adminAuth: true` in localStorage
   - The `AdminLayout` component serves as a wrapper for authentication

2. **App Setup Authentication**:
   - Additional authentication layer for sensitive App Setup section
   - Uses a separate `superAdminAuth: true` in localStorage

## 2. Component Mapping

### Main Components

| Component | Purpose | Data Sources | Child Components | State Management |
|-----------|---------|--------------|------------------|------------------|
| `page.js` | Main entry point, displays dashboard & controls navigation | N/A | All main components | `currentView`, `selectedPlayerId` |
| `MatchReport` | Displays latest match report | `/api/matchReport` | None | `report`, `loading`, `showCopyToast` |
| `CurrentHalfSeason` | Shows current half-season stats | `/api/stats` | None | `stats`, `loading`, `activeTab` |
| `OverallSeasonPerformance` | Shows season-by-season stats | `/api/stats` | None | `stats`, `loading`, `selectedYear`, `activeTab` |
| `AllTimeStats` | Shows all-time leaderboards | `/api/allTimeStats` | None | `stats`, `loading` |
| `HonourRoll` | Shows hall of fame | `/api/honourroll` | None | `records`, `loading` |
| `PlayerProfile` | Shows individual player statistics | `/api/playerprofile` | None | `profile`, `loading`, `selectedPlayerId`, `selectedYear`, `selectedStat` |
| `AdminPanel` | Admin dashboard | N/A | Admin components | `currentSection` |

### Admin Components

| Component | Purpose | Data Sources | Child Components | State Management |
|-----------|---------|--------------|------------------|------------------|
| `AdminLayout` | Auth wrapper for admin | localStorage | N/A | `isAuthenticated`, `password`, `error` |
| `TeamAlgorithm` | Team formation/balancing | Multiple APIs | Multiple | Complex (team formation state) |
| `PlayerRatings` | Update player attributes | `/api/admin/players` | None | Player ratings state |
| `PlayerManager` | CRUD operations for players | `/api/admin/players` | None | Player CRUD state |
| `MatchManager` | CRUD operations for matches | `/api/admin/matches` | None | Match CRUD state |
| `AppSetup` | App configuration | Various APIs | Multiple | App configuration state |

### UI Components

| Component | Purpose | Props | Used By |
|-----------|---------|-------|---------|
| `Card` | Wrapper for content sections | `className`, `onClick`, `children` | Most components |
| `Button` | Interactive buttons | `variant`, `size`, `icon`, `onClick`, `children` | Many components |
| `Table` | Data display | `responsive`, `children` | Stat display components |
| `Tabs` | Content organization | `defaultTab`, `onChange`, `variant`, `children` | Components with multiple content sections |
| `Tab` | Individual tab content | `label`, `children` | Used with `Tabs` |
| `ConfirmationDialog` | Confirm user actions | `isOpen`, `onConfirm`, `onCancel`, `title`, `message` | Admin components |

## 3. Data Flow Diagrams

### Main Application Data Flow
```
User Interaction → State Change (currentView) → Component Mount → 
API Request → Data Loading State → Response → 
Data Display → User Interaction
```

### Admin Components Data Flow
```
Authentication → Admin Dashboard → Component Selection → 
Component Mount → API Request → Data Loading/Editing → 
Submit Form → API Update → Success/Error Handling
```

### API Endpoint Structure

#### Public API Endpoints
| Endpoint | Purpose | Data Returned |
|----------|---------|---------------|
| `/api/matchReport` | Get latest match report | Match details, stats, milestones |
| `/api/stats` | Get player stats for a period | Season stats, goal stats, form data |
| `/api/allTimeStats` | Get all-time leaderboards | Player rankings, stats leaders |
| `/api/honourroll` | Get hall of fame records | Record holders, achievements |
| `/api/playerprofile` | Get player profile | Player details, yearly stats |

#### Admin API Endpoints
| Endpoint | Purpose | Data Returned/Accepted |
|----------|---------|------------------------|
| `/api/admin/players` | CRUD operations for players | Player details |
| `/api/admin/matches` | CRUD operations for matches | Match details, results |
| `/api/admin/teamAlgorithm` | Team formation logic | Player ratings, team configurations |
| `/api/admin/appSetup` | Application configuration | App settings, algorithms |

## 4. User Journeys

### Regular User Flows

1. **Viewing Latest Match Report**
   ```
   Landing Page → Match Report Card → MatchReport Component → 
   View Stats → Back to Dashboard
   ```

2. **Checking Season Stats**
   ```
   Landing Page → Current Half-Season Card → CurrentHalfSeason Component → 
   View Stats → Back to Dashboard
   ```

3. **Viewing Player Profile**
   ```
   Landing Page → Player Profiles Card → PlayerProfile Component → 
   Select Player → View Profile → Back to Dashboard
   ```

### Admin User Flows

1. **Managing Players**
   ```
   Landing Page → Admin Section Card → Authentication → Admin Dashboard → 
   Player Management Card → PlayerManager Component → 
   Add/Edit/Delete Player → Back to Admin Dashboard → Back to Main Dashboard
   ```

2. **Creating Teams**
   ```
   Landing Page → Admin Section Card → Authentication → Admin Dashboard → 
   Next Match Management Card → TeamAlgorithm Component → 
   Select Players → Generate Teams → Adjust Teams → Save → 
   Back to Admin Dashboard → Back to Main Dashboard
   ```

## 5. UI Component Library

### Core Components
The application uses a set of reusable UI components for consistent design:

1. **Card** (`src/components/ui/card.js`)
   - Primary container for content sections
   - Supports optional click handlers for interactive cards
   - Styling: white background, subtle shadow, rounded corners

2. **Button** (`src/components/ui/Button.js`)
   - Multi-purpose button component
   - Variants: primary (blue), secondary (gray), success (green), error (red)
   - Sizes: sm, md, lg
   - Optional icon support

3. **Table** (`src/components/ui/Table.js`) 
   - Responsive data tables
   - Includes TableHead, TableBody, TableRow, TableCell sub-components
   - Responsive behavior for mobile devices

4. **Tabs** (`src/components/ui/Tabs.js`)
   - Content organization with multiple tabs
   - Variants: underline, pills, cards
   - Used for organizing related content sections

### Style Conventions

1. **Color System**
   - Primary: blue-based (`primary-500`, `primary-600`)
   - Neutrals: gray scale (`neutral-50` through `neutral-900`)
   - Status colors: success (green), warning (yellow), error (red)
   - Text primarily uses neutral colors

2. **Spacing System**
   - Uses Tailwind's spacing utilities
   - Custom classes: `mb-section`, `mb-element`, `mb-related`, etc.

3. **Responsive Design**
   - Mobile-first approach
   - Breakpoint `md:` (768px) for desktop layouts
   - Stacked layouts on mobile, grid layouts on desktop

## 6. Authentication & Authorization

### Admin Access Control
1. **Authentication Mechanism**
   - Simple password-based system
   - Passwords stored in application code (no backend auth)
   - Authentication state stored in localStorage

2. **Security Implementation**
   - Two-level authentication:
     - Basic admin access: `adminAuth: true` in localStorage
     - Super admin access: `superAdminAuth: true` in localStorage
   - No token-based auth or session management
   - No user accounts or role-based permissions

3. **Protected Components**
   - `AdminLayout`: Wraps all admin components
   - `ProtectedAppSetup`: Additional protection for app configuration

## 7. Responsive Design Implementation

### Mobile Adaptations
1. **Dashboard**
   - Cards stack vertically on mobile
   - Grid layout on desktop (2-3 columns)

2. **Data Display**
   - Tables become scrollable on mobile
   - Key metrics displayed in cards for better mobile visibility

3. **Tab Pattern**
   - Content with multiple sections uses tabs on mobile
   - Side-by-side layout on desktop (e.g., points and goals leaderboards)

### Breakpoints
1. **Mobile**: < 768px
   - Single column layouts
   - Vertical stacking of content
   - Tab-based navigation for related content

2. **Desktop**: ≥ 768px
   - Multi-column grid layouts
   - Side-by-side content display
   - More information visible at once

### Touch Interactions
1. **Cards**: Large, tappable areas for navigation
2. **Buttons**: Adequate sizing for touch targets
3. **Form Controls**: Mobile-friendly input sizes

## 8. Technical Debt & Known Issues

### Architecture Issues
1. **State-Based Navigation**
   - Current system relies on React state for navigation instead of proper routing
   - No browser history support (back button doesn't work)
   - No deep linking capability

2. **Component Organization**
   - All primary views rendered conditionally in `page.js`
   - Limited code splitting and lazy loading

### UX Concerns
1. **Mobile Navigation**
   - Card-based navigation requires precise tapping
   - Significant vertical scrolling on mobile
   - No persistent navigation across views

2. **Cross-Section Navigation**
   - No way to navigate directly between sections
   - Always requires going back to the dashboard first

### Future Improvement Areas
1. **Proper URL Routing**
   - Implement Next.js App Router for proper URL-based navigation
   - Enable browser history and deep linking

2. **Mobile-First Navigation**
   - Add a bottom navigation bar for primary navigation on mobile
   - Add a sidebar navigation for desktop

3. **State Management**
   - Move to more structured state management
   - Use URL parameters for filters and selections 