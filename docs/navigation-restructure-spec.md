# Navigation Restructure Specification - UPDATED

## Overview

This document outlines the plan to transform the current card-based navigation system into a more mobile-friendly navigation structure with a bottom navigation bar for primary navigation. The restructuring aims to improve usability, particularly on mobile devices, while maintaining a consistent and intuitive experience across all screen sizes.

## Table of Contents

1. [Current Structure Analysis](#current-structure-analysis)
2. [Proposed Structure](#proposed-structure)
3. [Implementation Plan](#implementation-plan)
   - [Component Creation](#component-creation)
   - [Layout Modifications](#layout-modifications)
   - [Routing Changes](#routing-changes)
   - [Content Organization](#content-organization)
4. [File Changes](#file-changes)
5. [Visual Design Guidelines](#visual-design-guidelines)
6. [Admin Authentication](#admin-authentication)
7. [Testing Guidelines](#testing-guidelines)
8. [Error Handling](#error-handling)
9. [Animation Standards](#animation-standards)
10. [Migration Strategy](#migration-strategy)
11. [Performance Considerations](#performance-considerations)
12. [Fallback Plans](#fallback-plans)

## Current Structure Analysis

The current application uses a card-based navigation system on the homepage, where users select from various cards to navigate to different sections of the application:

1. **Navigation Flow:**
   - Users land on a homepage with card options
   - Clicking a card changes the `currentView` state in `src/app/page.js`
   - The selected component is conditionally rendered
   - Users return via a "Back to Dashboard" button

2. **Main Navigation Sections:**
   - Latest Match Report
   - Current Half-Season
   - Performance by Season
   - All-Time Leaderboard
   - Hall of Fame
   - Player Profiles
   - Admin Section

3. **Technical Implementation:**
   - Uses React state for view management instead of proper routing
   - All primary views are rendered through conditional logic in `src/app/page.js`
   - Admin section has a separate layout with its own navigation structure

4. **Issues with Current Approach:**
   - Poor mobile usability (requires precise tapping on cards)
   - Significant vertical scrolling required on smaller screens
   - No persistent navigation across views
   - Relies on component state instead of URL-based routing
   - Inconsistent navigation patterns between admin and main sections
   - No browser history support (can't use back/forward buttons)
   - No deep linking capability

## Proposed Structure

The new navigation structure organizes content into logical sections with a bottom navigation bar on mobile and a sidebar on desktop:

1. **Primary Navigation Items:**
   - **Matchday** - Shows upcoming match players (placeholder currently)
   - **Report** - Latest match report
   - **Season** - Current live season (default) with comparison capabilities
   - **More** - Access to less frequently used features

2. **More Section Contains:**
   - Players (individual profiles)
   - Historical Stats (All-Time Leaderboard, Hall of Fame)
   - Admin access (for authorized users)

3. **Navigation Behavior:**
   - Mobile (< 768px): Bottom navigation bar with icons and labels
   - Tablet/Desktop (≥ 768px): Sidebar navigation (collapsible)
   - Secondary navigation within sections via tabs

4. **Hierarchical Organization:**
   - Primary: Main navigation categories (Bottom/Side Nav)
   - Secondary: Related content within a category (Tabs)
   - Tertiary: Detailed content or filtering options (In-page controls)

## Implementation Plan

### Component Creation

1. **Create BottomNav Component:**
   - Create `src/components/navigation/BottomNav.tsx`
   - Include 4-5 navigation items with icons and labels
   - Support active state highlighting
   - Fixed positioning at bottom of viewport on mobile (< 768px)
   - Use blue color scheme (`text-primary-600`) for active state, neutral colors for inactive

2. **Create SideNav Component:**
   - Create `src/components/navigation/SideNav.tsx`
   - Visible only at md breakpoint and above (≥ 768px)
   - Collapsible/expandable behavior
   - Includes same items as BottomNav plus any additional options
   - Use consistent styling with BottomNav (primary-blue active state)

3. **Create More Screen:**
   - Create `src/app/more/page.tsx`
   - Organized menu layout with categories:
     - Players section with search/filter
     - Historical Stats section (All-Time Leaderboard, Hall of Fame)
     - Admin access (if authorized)
   - Use card-based approach similar to current homepage but optimized for navigation

### Layout Modifications

1. **Update Root Layout:**
   - Modify `src/app/layout.js` to include navigation components
   - Add responsive display logic (BottomNav < 768px, SideNav ≥ 768px)
   - Add proper page padding to prevent content overlap with fixed navigation (pb-24 on mobile)

2. **Create Layout Components:**
   - Create `src/components/layouts/MainLayout.tsx` for non-admin pages
   - Update `src/components/layouts/AdminLayout.js` to match new navigation patterns
   - Ensure consistent styling across all layouts

3. **Content Area Adjustments:**
   - Add bottom padding to main content area to prevent overlap with BottomNav
   - Use `pb-24` on mobile only to provide space below content
   - Use `md:ml-64` for content margin on tablet/desktop to accommodate sidebar
   - Implement smooth scrolling with `scroll-behavior: smooth` in CSS

### Routing Changes

1. **Convert to Next.js App Router:**
   - Replace state-based navigation with proper routing
   - Create directory structure for all main sections:
     - `src/app/matchday/page.tsx`
     - `src/app/report/page.tsx`
     - `src/app/season/page.tsx`
     - `src/app/more/page.tsx`
   
2. **Implement Nested Routes:**
   - For Season section, create:
     - `src/app/season/page.tsx` (Current Half-Season view by default)
     - `src/app/season/comparison/page.tsx` (Performance by Season)
   
   - For More section, create:
     - `src/app/more/players/page.tsx` (Player listing)
     - `src/app/more/players/[id]/page.tsx` (Player profiles)
     - `src/app/more/all-time/page.tsx` (All-Time Leaderboard)
     - `src/app/more/hall-of-fame/page.tsx` (Hall of Fame)
   
   - For Reports, create:
     - `src/app/report/page.tsx` (Latest report by default)
     - `src/app/report/[id]/page.tsx` (Specific reports)

3. **Admin Section:**
   - Keep admin section under:
     - `src/app/admin/...` (existing structure)
   - Update admin layout to match new navigation patterns
   - Fully integrate admin section with the new navigation system while maintaining existing functionality

4. **Deep Linking Implementation:**
   - For dynamic routes, use clear parameter naming:
     - `/more/players/[id]` for player profiles
     - `/report/[id]` for specific match reports
     - `/season/[year]/[half]` for specific season data
   - Implement proper data fetching in page components
   - Add fallback UI for loading states
   - Add error handling for invalid parameters

5. **Content Migration Strategy:**
   - Create page components that wrap existing component functionality
   - Keep data fetching logic within existing components rather than moving it to page level
   - This maintains separation of concerns and minimizes risks during migration
   - Example migration of a component to a page:
   ```jsx
   // src/app/more/all-time/page.tsx
   'use client';
   import AllTimeStats from '@/components/AllTimeStats';
   
   export default function AllTimeStatsPage() {
     return <AllTimeStats />;
   }
   ```

### Content Organization

1. **Landing Page:**
   - Update `src/app/page.tsx` to show a welcome dashboard with:
     - Brief overview of key statistics 
     - Direct links to primary sections
     - Visually aligned with the new navigation system
   - This provides a user-friendly entry point to the application

2. **Tab Navigation for Sections:**
   - Use the existing Tabs component for secondary navigation within sections
   - Apply tabs consistently for related content sets
   - Example for Season section:
   ```jsx
   // src/app/season/page.tsx
   'use client';
   import React from 'react';
   import { Tabs, Tab } from '@/components/ui/Tabs';
   import CurrentHalfSeason from '@/components/CurrentHalfSeason';
   import OverallSeasonPerformance from '@/components/OverallSeasonPerformance';
   
   export default function SeasonPage() {
     return (
       <div>
         <h1 className="text-2xl font-bold text-neutral-900 mb-6">Season Statistics</h1>
         
         <div className="card">
           <Tabs defaultTab={0}>
             <Tab label="Current Half-Season">
               <CurrentHalfSeason />
             </Tab>
             <Tab label="Performance by Season">
               <OverallSeasonPerformance />
             </Tab>
           </Tabs>
         </div>
       </div>
     );
   }
   ```

3. **More Page Design:**
   - Organize content into logical sections with visual hierarchy
   - Group related items under section headings
   ```jsx
   // src/app/more/page.tsx (concept)
   export default function MorePage() {
     const sections = [
       {
         title: 'Players',
         items: [
           {
             name: 'Player Directory',
             description: 'Browse all player profiles',
             href: '/more/players',
             icon: /* Player icon */,
           }
         ]
       },
       {
         title: 'Statistics',
         items: [
           {
             name: 'All-Time Leaderboard',
             description: 'View the all-time statistics leaders',
             href: '/more/all-time',
             icon: /* Stats icon */,
           },
           {
             name: 'Hall of Fame',
             description: 'Explore historic achievements',
             href: '/more/hall-of-fame',
             icon: /* Trophy icon */,
           }
         ]
       }
     ];
     
     return (
       <div className="space-y-6">
         <h1 className="text-2xl font-bold text-neutral-900 mb-4">More</h1>
         
         {sections.map((section) => (
           <div key={section.title} className="card mb-4">
             <h2 className="px-4 py-2 bg-neutral-50 font-medium">{section.title}</h2>
             <div className="divide-y divide-neutral-100">
               {section.items.map((item) => (
                 <div 
                   key={item.href}
                   className="p-4 flex items-center cursor-pointer hover:bg-neutral-50 transition-colors duration-200"
                   onClick={() => router.push(item.href)}
                 >
                   <div className="p-2 bg-primary-50 rounded-lg text-primary-600 mr-4">
                     {item.icon}
                   </div>
                   <div>
                     <h3 className="font-medium text-neutral-900">{item.name}</h3>
                     <p className="text-sm text-neutral-600">{item.description}</p>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         ))}
       </div>
     );
   }
   ```

4. **Matchday Page:**
   - Create a placeholder component with:
     - A "Coming Soon" message
     - Basic UI elements that match the style of other sections
     - Mock data structure ready for future implementation
   ```jsx
   // src/app/matchday/page.tsx
   'use client';
   import Card from '@/components/ui/card';
   
   export default function MatchdayPage() {
     return (
       <div>
         <h1 className="text-2xl font-bold text-neutral-900 mb-6">Matchday</h1>
         
         <Card>
           <div className="py-12 text-center">
             <div className="p-4 bg-primary-50 rounded-full inline-flex text-primary-600 mb-4">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <h2 className="text-xl font-semibold text-neutral-900 mb-2">
               Coming Soon
             </h2>
             <p className="text-neutral-600 max-w-md mx-auto">
               We're working on new features for the Matchday section. 
               Soon you'll be able to view upcoming match information here.
             </p>
           </div>
         </Card>
       </div>
     );
   }
   ```

## File Changes

The following files need to be created or modified:

### New Files:

1. **Navigation Components:**
   - `src/components/navigation/BottomNav.tsx`
   - `src/components/navigation/SideNav.tsx`
   - `src/components/navigation/NavItem.tsx` (reusable component for nav items)
   - `src/components/navigation/TabNavigation.tsx` (for secondary navigation)

2. **Layouts:**
   - `src/components/layouts/MainLayout.tsx`

3. **New Pages:**
   - `src/app/matchday/page.tsx`
   - `src/app/report/page.tsx`
   - `src/app/report/[id]/page.tsx`
   - `src/app/season/page.tsx`
   - `src/app/season/comparison/page.tsx`
   - `src/app/more/page.tsx`
   - `src/app/more/players/page.tsx`
   - `src/app/more/players/[id]/page.tsx`
   - `src/app/more/all-time/page.tsx`
   - `src/app/more/hall-of-fame/page.tsx`
   - `src/app/not-found.tsx` (custom 404 page)

### Modified Files:

1. **Core Layout:**
   - `src/app/layout.js` - Add navigation components

2. **Existing Components:**
   - `src/components/CurrentHalfSeason.js` - Adapt for page component
   - `src/components/OverallSeasonPerformance.js` - Adapt for page component
   - `src/components/AllTimeStats.js` - Adapt for page component
   - `src/components/HonourRoll.js` - Adapt for page component
   - `src/components/PlayerProfile.js` - Adapt for page component
   - `src/components/MatchReport/MatchReport.js` - Adapt for page component
   - `src/components/admin/AdminLayout.js` - Update to match new navigation patterns

3. **Home Page:**
   - `src/app/page.js` - Convert to dashboard layout

## Visual Design Guidelines

### Color System

Use the color system defined in `tailwind.config.js`:

- **Primary Color:** Blue (`#2196F3`, `primary-500`) - Use for active states, key actions, and important UI elements
  - Active navigation: `text-primary-600` (slightly darker blue)
  - Hover states: `hover:bg-primary-50` (very light blue background)
  - Icons in active state: `text-primary-600`
- **Text Colors:** Use the neutral color palette (`text-neutral-900`, `text-neutral-600`, etc.)
- **Background Colors:** White for cards/containers (`bg-white`), light neutral for page backgrounds (`bg-neutral-50`)
- **Border Colors:** Light neutral for separation (`border-neutral-200`, `border-neutral-300`)

The following color references from the Tailwind config should be used consistently:

```jsx
// Primary Blue Colors - Use for active states, primary actions, and branding
primary: {
  50: '#E3F2FD',  // Very light blue - backgrounds, hover states
  100: '#BBDEFB', // Light blue - secondary backgrounds
  200: '#90CAF9', // Light blue - tertiary elements
  300: '#64B5F6', // Medium light blue
  400: '#42A5F5', // Medium blue
  500: '#2196F3', // Main blue - primary buttons, main actions
  600: '#1E88E5', // Slightly darker blue - active states, hover states for buttons
  700: '#1976D2', // Dark blue - pressed states
  800: '#1565C0', // Darker blue - secondary states
  900: '#0D47A1', // Very dark blue - tertiary states
}

// Neutral Colors - Use for text, backgrounds, and borders
neutral: {
  50: '#FAFAFA',  // Very light gray - page backgrounds
  100: '#F5F5F5', // Light gray - card backgrounds, hover states
  200: '#EEEEEE', // Light gray - borders, dividers
  300: '#E0E0E0', // Medium light gray - stronger borders
  400: '#BDBDBD', // Medium gray - disabled states
  500: '#9E9E9E', // Medium gray - placeholder text
  600: '#757575', // Medium dark gray - secondary text
  700: '#616161', // Dark gray - tertiary text
  800: '#424242', // Dark gray - primary text
  900: '#212121', // Very dark gray - headings
}
```

### Bottom Navigation Bar

```jsx
// src/components/navigation/BottomNav.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BottomNav = () => {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: 'Matchday',
      href: '/matchday',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Report',
      href: '/report',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Season',
      href: '/season',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      name: 'More',
      href: '/more',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg border-t border-neutral-200">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 flex-1 
                transition-colors duration-200
                ${active ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <div className={`transition-transform duration-200 ${active ? 'text-primary-600 scale-110' : 'text-neutral-500'}`}>
                {item.icon}
              </div>
              <span className="text-xs mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The specification outlines a basic password authentication with localStorage, but we need to verify if this matches your current authentication approach.

## Testing Guidelines

The specification outlines a basic testing approach, but we need to verify if this aligns with your existing testing practices.

## Error Handling

The specification outlines an ErrorBoundary component but we should confirm if this aligned with your existing error handling patterns.

## Animation Standards

The specification outlines certain animation durations and easing functions, but it would be helpful to confirm if these align with your existing design patterns.

## Migration Strategy

The specification outlines a migration path from state-based navigation to proper routing, but we need to clarify if all components must be client components (`'use client'`) or if some can be server components.

## Performance Considerations

The specification outlines some performance considerations, but we need to verify if these align with your existing performance optimization strategies.

## Fallback Plans

The specification outlines fallback plans for various scenarios, but we need to verify if these align with your existing error handling and fallback strategies.

## TypeScript Implementation

The specification shows some components with TypeScript interfaces, but we need to confirm if all new components should use TypeScript or if JavaScript is acceptable.

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
# Navigation Restructure Specification - UPDATED

## Overview

This document outlines the plan to transform the current card-based navigation system into a more mobile-friendly navigation structure with a bottom navigation bar for primary navigation. The restructuring aims to improve usability, particularly on mobile devices, while maintaining a consistent and intuitive experience across all screen sizes.

## Table of Contents

1. [Current Structure Analysis](#current-structure-analysis)
2. [Proposed Structure](#proposed-structure)
3. [Implementation Plan](#implementation-plan)
   - [Component Creation](#component-creation)
   - [Layout Modifications](#layout-modifications)
   - [Routing Changes](#routing-changes)
   - [Content Organization](#content-organization)
4. [File Changes](#file-changes)
5. [Visual Design Guidelines](#visual-design-guidelines)
6. [Admin Authentication](#admin-authentication)
7. [Testing Guidelines](#testing-guidelines)
8. [Error Handling](#error-handling)
9. [Animation Standards](#animation-standards)
10. [Migration Strategy](#migration-strategy)
11. [Performance Considerations](#performance-considerations)
12. [Fallback Plans](#fallback-plans)

## Current Structure Analysis

The current application uses a card-based navigation system on the homepage, where users select from various cards to navigate to different sections of the application:

1. **Navigation Flow:**
   - Users land on a homepage with card options
   - Clicking a card changes the `currentView` state in `src/app/page.js`
   - The selected component is conditionally rendered
   - Users return via a "Back to Dashboard" button

2. **Main Navigation Sections:**
   - Latest Match Report
   - Current Half-Season
   - Performance by Season
   - All-Time Leaderboard
   - Hall of Fame
   - Player Profiles
   - Admin Section

3. **Technical Implementation:**
   - Uses React state for view management instead of proper routing
   - All primary views are rendered through conditional logic in `src/app/page.js`
   - Admin section has a separate layout with its own navigation structure

4. **Issues with Current Approach:**
   - Poor mobile usability (requires precise tapping on cards)
   - Significant vertical scrolling required on smaller screens
   - No persistent navigation across views
   - Relies on component state instead of URL-based routing
   - Inconsistent navigation patterns between admin and main sections
   - No browser history support (can't use back/forward buttons)
   - No deep linking capability

## Proposed Structure

The new navigation structure organizes content into logical sections with a bottom navigation bar on mobile and a sidebar on desktop:

1. **Primary Navigation Items:**
   - **Matchday** - Shows upcoming match players (placeholder currently)
   - **Report** - Latest match report
   - **Season** - Current live season (default) with comparison capabilities
   - **More** - Access to less frequently used features

2. **More Section Contains:**
   - Players (individual profiles)
   - Historical Stats (All-Time Leaderboard, Hall of Fame)
   - Admin access (for authorized users)

3. **Navigation Behavior:**
   - Mobile (< 768px): Bottom navigation bar with icons and labels
   - Tablet/Desktop (≥ 768px): Sidebar navigation (collapsible)
   - Secondary navigation within sections via tabs

4. **Hierarchical Organization:**
   - Primary: Main navigation categories (Bottom/Side Nav)
   - Secondary: Related content within a category (Tabs)
   - Tertiary: Detailed content or filtering options (In-page controls)

## Implementation Plan

### Component Creation

1. **Create BottomNav Component:**
   - Create `src/components/navigation/BottomNav.tsx`
   - Include 4-5 navigation items with icons and labels
   - Support active state highlighting
   - Fixed positioning at bottom of viewport on mobile (< 768px)
   - Use blue color scheme (`text-primary-600`) for active state, neutral colors for inactive

2. **Create SideNav Component:**
   - Create `src/components/navigation/SideNav.tsx`
   - Visible only at md breakpoint and above (≥ 768px)
   - Collapsible/expandable behavior
   - Includes same items as BottomNav plus any additional options
   - Use consistent styling with BottomNav (primary-blue active state)

3. **Create More Screen:**
   - Create `src/app/more/page.tsx`
   - Organized menu layout with categories:
     - Players section with search/filter
     - Historical Stats section (All-Time, Hall of Fame)
     - Admin access (if authorized)
   - Use card-based approach similar to current homepage but optimized for navigation

### Layout Modifications

1. **Update Root Layout:**
   - Modify `src/app/layout.js` to include navigation components
   - Add responsive display logic (BottomNav < 768px, SideNav ≥ 768px)
   - Add proper page padding to prevent content overlap with fixed navigation (pb-24 on mobile)

2. **Create Layout Components:**
   - Create `src/components/layouts/MainLayout.tsx` for non-admin pages
   - Update `src/components/layouts/AdminLayout.js` to match new navigation patterns
   - Ensure consistent styling across all layouts

3. **Content Area Adjustments:**
   - Add bottom padding to main content area to prevent overlap with BottomNav
   - Use `pb-24` on mobile only to provide space below content
   - Use `md:ml-64` for content margin on tablet/desktop to accommodate sidebar
   - Implement smooth scrolling with `scroll-behavior: smooth` in CSS

### Routing Changes

1. **Convert to Next.js App Router:**
   - Replace state-based navigation with proper routing
   - Create directory structure for all main sections:
     - `src/app/matchday/page.tsx`
     - `src/app/report/page.tsx`
     - `src/app/season/page.tsx`
     - `src/app/more/page.tsx`
   
2. **Implement Nested Routes:**
   - For Season section, create:
     - `src/app/season/page.tsx` (Current Half-Season view by default)
     - `src/app/season/comparison/page.tsx` (Performance by Season)
   
   - For More section, create:
     - `src/app/more/players/page.tsx` (Player listing)
     - `src/app/more/players/[id]/page.tsx` (Player profiles)
     - `src/app/more/all-time/page.tsx` (All-Time Leaderboard)
     - `src/app/more/hall-of-fame/page.tsx` (Hall of Fame)
   
   - For Reports, create:
     - `src/app/report/page.tsx` (Latest report by default)
     - `src/app/report/[id]/page.tsx` (Specific reports)

3. **Admin Section:**
   - Keep admin section under:
     - `src/app/admin/...` (existing structure)
   - Update admin layout to match new navigation patterns
   - Fully integrate admin section with the new navigation system while maintaining existing functionality

4. **Deep Linking Implementation:**
   - For dynamic routes, use clear parameter naming:
     - `/more/players/[id]` for player profiles
     - `/report/[id]` for specific match reports
     - `/season/[year]/[half]` for specific season data
   - Implement proper data fetching in page components
   - Add fallback UI for loading states
   - Add error handling for invalid parameters

5. **Content Migration Strategy:**
   - Create page components that wrap existing component functionality
   - Keep data fetching logic within existing components rather than moving it to page level
   - This maintains separation of concerns and minimizes risks during migration
   - Example migration of a component to a page:
   ```jsx
   // src/app/more/all-time/page.tsx
   'use client';
   import AllTimeStats from '@/components/AllTimeStats';
   
   export default function AllTimeStatsPage() {
     return <AllTimeStats />;
   }
   ```

### Content Organization

1. **Landing Page:**
   - Update `src/app/page.tsx` to show a welcome dashboard with:
     - Brief overview of key statistics 
     - Direct links to primary sections
     - Visually aligned with the new navigation system
   - This provides a user-friendly entry point to the application

2. **Tab Navigation for Sections:**
   - Use the existing Tabs component for secondary navigation within sections
   - Apply tabs consistently for related content sets
   - Example for Season section:
   ```jsx
   // src/app/season/page.tsx
   'use client';
   import React from 'react';
   import { Tabs, Tab } from '@/components/ui/Tabs';
   import CurrentHalfSeason from '@/components/CurrentHalfSeason';
   import OverallSeasonPerformance from '@/components/OverallSeasonPerformance';
   
   export default function SeasonPage() {
     return (
       <div>
         <h1 className="text-2xl font-bold text-neutral-900 mb-6">Season Statistics</h1>
         
         <div className="card">
           <Tabs defaultTab={0}>
             <Tab label="Current Half-Season">
               <CurrentHalfSeason />
             </Tab>
             <Tab label="Performance by Season">
               <OverallSeasonPerformance />
             </Tab>
           </Tabs>
         </div>
       </div>
     );
   }
   ```

3. **More Page Design:**
   - Organize content into logical sections with visual hierarchy
   - Group related items under section headings
   ```jsx
   // src/app/more/page.tsx (concept)
   export default function MorePage() {
     const sections = [
       {
         title: 'Players',
         items: [
           {
             name: 'Player Directory',
             description: 'Browse all player profiles',
             href: '/more/players',
             icon: /* Player icon */,
           }
         ]
       },
       {
         title: 'Statistics',
         items: [
           {
             name: 'All-Time Leaderboard',
             description: 'View the all-time statistics leaders',
             href: '/more/all-time',
             icon: /* Stats icon */,
           },
           {
             name: 'Hall of Fame',
             description: 'Explore historic achievements',
             href: '/more/hall-of-fame',
             icon: /* Trophy icon */,
           }
         ]
       }
     ];
     
     return (
       <div className="space-y-6">
         <h1 className="text-2xl font-bold text-neutral-900 mb-4">More</h1>
         
         {sections.map((section) => (
           <div key={section.title} className="card mb-4">
             <h2 className="px-4 py-2 bg-neutral-50 font-medium">{section.title}</h2>
             <div className="divide-y divide-neutral-100">
               {section.items.map((item) => (
                 <div 
                   key={item.href}
                   className="p-4 flex items-center cursor-pointer hover:bg-neutral-50 transition-colors duration-200"
                   onClick={() => router.push(item.href)}
                 >
                   <div className="p-2 bg-primary-50 rounded-lg text-primary-600 mr-4">
                     {item.icon}
                   </div>
                   <div>
                     <h3 className="font-medium text-neutral-900">{item.name}</h3>
                     <p className="text-sm text-neutral-600">{item.description}</p>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         ))}
       </div>
     );
   }
   ```

4. **Matchday Page:**
   - Create a placeholder component with:
     - A "Coming Soon" message
     - Basic UI elements that match the style of other sections
     - Mock data structure ready for future implementation
   ```jsx
   // src/app/matchday/page.tsx
   'use client';
   import Card from '@/components/ui/card';
   
   export default function MatchdayPage() {
     return (
       <div>
         <h1 className="text-2xl font-bold text-neutral-900 mb-6">Matchday</h1>
         
         <Card>
           <div className="py-12 text-center">
             <div className="p-4 bg-primary-50 rounded-full inline-flex text-primary-600 mb-4">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <h2 className="text-xl font-semibold text-neutral-900 mb-2">
               Coming Soon
             </h2>
             <p className="text-neutral-600 max-w-md mx-auto">
               We're working on new features for the Matchday section. 
               Soon you'll be able to view upcoming match information here.
             </p>
           </div>
         </Card>
       </div>
     );
   }
   ```

## File Changes

The following files need to be created or modified:

### New Files:

1. **Navigation Components:**
   - `src/components/navigation/BottomNav.tsx`
   - `src/components/navigation/SideNav.tsx`
   - `src/components/navigation/NavItem.tsx` (reusable component for nav items)
   - `src/components/navigation/TabNavigation.tsx` (for secondary navigation)

2. **Layouts:**
   - `src/components/layouts/MainLayout.tsx`

3. **New Pages:**
   - `src/app/matchday/page.tsx`
   - `src/app/report/page.tsx`
   - `src/app/report/[id]/page.tsx`
   - `src/app/season/page.tsx`
   - `src/app/season/comparison/page.tsx`
   - `src/app/more/page.tsx`
   - `src/app/more/players/page.tsx`
   - `src/app/more/players/[id]/page.tsx`
   - `src/app/more/all-time/page.tsx`
   - `src/app/more/hall-of-fame/page.tsx`
   - `src/app/not-found.tsx` (custom 404 page)

### Modified Files:

1. **Core Layout:**
   - `src/app/layout.js` - Add navigation components

2. **Existing Components:**
   - `src/components/CurrentHalfSeason.js` - Adapt for page component
   - `src/components/OverallSeasonPerformance.js` - Adapt for page component
   - `src/components/AllTimeStats.js` - Adapt for page component
   - `src/components/HonourRoll.js` - Adapt for page component
   - `src/components/PlayerProfile.js` - Adapt for page component
   - `src/components/MatchReport/MatchReport.js` - Adapt for page component
   - `src/components/admin/AdminLayout.js` - Update to match new navigation patterns

3. **Home Page:**
   - `src/app/page.js` - Convert to dashboard layout

## Visual Design Guidelines

### Color System

Use the color system defined in `tailwind.config.js` and maintained in the application:

- **Primary Color:** Blue (`#2196F3`) - Use for active states, key actions, and important UI elements
- **Text Colors:** Use the neutral color palette (`text-neutral-900`, `text-neutral-600`, etc.)
- **Background Colors:** White for cards/containers (`bg-white`), light neutral for page backgrounds (`bg-neutral-50`)
- **Border Colors:** Light neutral for separation (`border-neutral-200`, `border-neutral-300`)

### Bottom Navigation Bar

```jsx
// src/components/navigation/BottomNav.tsx
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BottomNav = () => {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: 'Matchday',
      href: '/matchday',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Report',
      href: '/report',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Season',
      href: '/season',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      name: 'More',
      href: '/more',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-lg border-t border-neutral-200">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 flex-1 
                transition-colors duration-200
                ${active ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <div className={`transition-transform duration-200 ${active ? 'text-primary-600 scale-110' : 'text-neutral-500'}`}>
                {item.icon}
              </div>
              <span className="text-xs mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
```

### Side Navigation Bar

```jsx
// src/components/navigation/SideNav.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SideNav = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  
  const navItems = [
    {
      name: 'Matchday',
      href: '/matchday',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Report',
      href: '/report',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Season',
      href: '/season',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      name: 'Players',
      href: '/more/players',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'All-Time Stats',
      href: '/more/all-time',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Hall of Fame',
      href: '/more/hall-of-fame',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
    {
      name: 'Admin',
      href: '/admin',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const isActive = (path) => {
    if (path === '/more' && pathname.startsWith('/more/')) {
      return true;
    }
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <div className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg border-r border-neutral-200 z-40">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Berko TNF" className="h-8 w-auto" />
            {!collapsed && <span className="ml-2 font-semibold text-lg">Berko TNF</span>}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-grow">
          <nav className="p-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center py-2 px-3 my-1 rounded-md transition-colors ${
                    active 
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <div className={active ? 'text-primary-600' : 'text-neutral-500'}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="ml-3 font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            {!collapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-700">User Name</p>
                <button className="text-xs text-neutral-500 hover:text-primary-600">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideNav;
```

### Main Layout Updates

```jsx
// src/app/layout.js
import "./globals.css";
import BottomNav from '@/components/navigation/BottomNav';
import SideNav from '@/components/navigation/SideNav';

export const metadata = {
  title: "Berko TNF Stats",
  description: "Statistics for Berko TNF Football",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      </head>
      <body className="h-full">
        <div className="min-h-full flex flex-col">
          {/* Top navigation with logo only */}
          <nav className="bg-white shadow-sm md:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <a href="/" className="flex items-center">
                      <img 
                        src="/logo.png" 
                        alt="Berko TNF" 
                        className="h-10 w-auto my-1"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          
          {/* Desktop side navigation */}
          <SideNav />
          
          {/* Main content area */}
          <main className="flex-grow bg-neutral-50 py-6 md:ml-64 pb-24 md:pb-6 animate-fadeIn">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          
          {/* Mobile bottom navigation */}
          <BottomNav />
          
          {/* Footer - hidden on mobile to save space */}
          <footer className="bg-white hidden md:block">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 md:ml-64">
              <p className="text-center text-sm text-neutral-500">
                © {new Date().getFullYear()} Berko TNF. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
```

### Usage in Page Components

```jsx
// src/app/season/page.tsx - Example
'use client';
import React from 'react';
import { Tabs, Tab } from '@/components/ui/Tabs';
import CurrentHalfSeason from '@/components/CurrentHalfSeason';
import OverallSeasonPerformance from '@/components/OverallSeasonPerformance';
import Card from '@/components/ui/card';

export default function SeasonPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Season Statistics</h1>
      
      <Card className="mb-6">
        <Tabs defaultTab={0}>
          <Tab label="Current Half-Season">
            <CurrentHalfSeason />
          </Tab>
          <Tab label="Performance by Season">
            <OverallSeasonPerformance />
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}
```

### Transition Animations

To enhance the user experience, add subtle animations to navigation interactions:

1. **Page Transitions:**
   - Implement fade in/out between pages for a smoother experience
   - Example implementation using CSS transitions:

```jsx
// src/app/layout.js (animation wrapper)
<main className="flex-grow bg-neutral-50 py-6 md:ml-64 pb-24 md:pb-6 animate-fadeIn">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {children}
  </div>
</main>

// Add to tailwind.config.js
{
  theme: {
    extend: {
      // ... existing extensions
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
    },
  },
}
```

2. **Navigation Interactions:**
   - Add subtle hover and active states to navigation items
   - Example for bottom navigation:

```jsx
// In BottomNav.tsx
<Link
  key={item.name}
  href={item.href}
  className={`flex flex-col items-center justify-center py-2 flex-1 
    transition-colors duration-200
    ${active ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
>
  <div className={`transition-transform duration-200 ${active ? 'text-primary-600 scale-110' : 'text-neutral-500'}`}>
    {item.icon}
  </div>
  <span className="text-xs mt-1 font-medium">{item.name}</span>
</Link>
```

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out;
   }
   ```

2. **Responsive Behavior:**
   - Mobile (< 768px): Bottom navigation visible, sidebar hidden
   - Desktop (≥ 768px): Bottom navigation hidden, sidebar visible
   - Transitions should be smooth but not overly complex to maintain performance

3. **Active State Implementation:**
   - Parent routes should remain highlighted when viewing child routes
   - Clear visual indicators should show the current section
   - Secondary navigation (tabs) should properly show active state
   - Example active state logic:
   ```jsx
   const isActive = (path) => {
     // Base case - exact match
     if (pathname === path) return true;
     
     // Child route case - parent should stay active
     if (path !== '/' && pathname.startsWith(path + '/')) return true;
     
     // Special case for More section
     if (path === '/more' && 
        (pathname.startsWith('/more/players') || 
         pathname.startsWith('/more/all-time') || 
         pathname.startsWith('/more/hall-of-fame'))) {
       return true;
     }
     
     return false;
   };
   ```

These animations should be subtle and enhance usability without being distracting.

## Admin Authentication

The current implementation uses a basic password method for admin access. We'll maintain this approach for simplicity while improving the implementation:

### Password Protection Implementation

1. **Authentication Strategy:**
   - Keep Admin section visible to all users in the navigation
   - Protect access with a simple password check
   - Store password securely (but client-side for now)
   - Store authentication state in localStorage with expiration (24 hours)
   - Maintain the existing password used in the current implementation

2. **Authentication Flow:**
   - Create a simple password entry page at `src/app/admin/login/page.tsx`
   - Redirect to this page when attempting to access any admin route
   - Store authentication state in localStorage with expiration
   - Redirect to requested admin page after successful authentication

3. **Required Components:**
   - `src/components/auth/AdminLogin.tsx` - Password entry component
   - `src/components/auth/AdminProtectedRoute.tsx` - Simple route guard for admin pages

4. **Implementation Example:**

```jsx
// src/components/auth/AdminLogin.tsx
'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple password verification - would be better on server-side
    // In a real implementation, use proper auth or at least hash comparison
    if (password === 'admin123') { // Replace with your actual password or env variable
      // Set authenticated flag with expiration (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('adminAuth', JSON.stringify({ 
        authenticated: true,
        expiresAt
      }));
      
      // Redirect to the requested admin page
      router.push(redirectTo);
    } else {
      setError('Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Admin Access</h1>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Admin Area'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
```

## Testing Guidelines

1. **Mobile Testing:**
   - Test on various mobile device sizes (small, medium, large)
   - Verify bottom navigation is fixed at the bottom
   - Ensure content is properly padded to avoid overlap (pb-24 should be sufficient)
   - Test touch targets are large enough (minimum 44x44px)

2. **Desktop Testing:**
   - Test sidebar navigation in expanded and collapsed states
   - Verify proper responsive breakpoints for layout changes
   - Ensure proper spacing and alignment with sidebar navigation
   - Check that sidebar width (w-64) matches content margin (ml-64)

3. **Navigation Testing:**
   - Verify all primary and secondary navigation links work
   - Test browser back/forward buttons with the new routing structure
   - Test deep linking to specific sections (e.g., `/more/players/123`)
   - Verify active state highlighting works correctly for nested routes
   - Test that animations don't interfere with navigation functionality

4. **Content Testing:**
   - Ensure all content is properly displayed in new layout
   - Verify no data or functionality is lost in the transition
   - Test all interactive elements within content areas
   - Verify data fetching works correctly with new route parameters

5. **Accessibility Testing:**
   - Verify proper focus management
   - Test keyboard navigation
   - Ensure proper ARIA attributes on navigation elements
   - Test with screen readers
   - Verify color contrast meets WCAG standards

## Error Handling

To ensure a robust user experience, implement comprehensive error handling:

### 1. Error Boundaries

Implement error boundaries to catch rendering errors:

```jsx
// src/components/ErrorBoundary.tsx
'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
          <div className="text-neutral-900 text-xl font-semibold mb-2">Something went wrong</div>
          <p className="text-neutral-600 mb-6">We're having trouble displaying this content</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Use this in the root layout:

```jsx
// src/app/layout.js
import ErrorBoundary from '@/components/ErrorBoundary';

// In the layout component:
<main className="...">
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
</main>
```

### 2. Data Fetching Error States

For data fetching errors, implement consistent error states:

```jsx
// Example in a page component
const [error, setError] = useState(null);

// In the fetch function:
try {
  // fetching logic
} catch (err) {
  setError(err.message || 'Failed to load data');
}

// In the render function:
if (error) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="text-error-600 mr-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-error-800 font-medium">Error loading data</h3>
          <p className="text-error-700 text-sm">{error}</p>
          <button 
            className="mt-2 text-sm text-error-800 hover:text-error-900 font-medium"
            onClick={() => {
              setError(null);
              fetchData(); // Retry function
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Custom 404 Page

```jsx
// src/app/not-found.jsx
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <h1 className="text-4xl font-bold text-neutral-900 mb-2">404</h1>
      <p className="text-xl text-neutral-600 mb-8">Page not found</p>
      <p className="text-neutral-500 mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" passHref>
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

## Animation Standards

To ensure consistent animations throughout the application:

### 1. Duration and Timing

- **Standard Durations:**
  - Fast interactions (hover, focus): 150ms
  - Standard transitions (page elements, navigation): 200ms
  - Complex animations (page transitions): 300ms

- **Easing Functions:**
  - Basic transitions: `ease-in-out`
  - Entrance animations: `ease-out`
  - Exit animations: `ease-in`

### 2. Implementation

```css
/* In globals.css */
@layer base {
  html {
    scroll-behavior: smooth;
  }
  
  * {
    @apply transition-property-[color,background-color,border-color,text-decoration-color,fill,stroke];
    @apply transition-timing-function-[ease-in-out];
    @apply transition-duration-[200ms];
  }
}
```

### 3. Animation Types

- **Page Transitions:**
  ```jsx
  // Add to tailwind.config.js
  {
    theme: {
      extend: {
        // ... existing extensions
        keyframes: {
          fadeIn: {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        },
        animation: {
          fadeIn: 'fadeIn 0.3s ease-out',
          slideUp: 'slideUp 0.2s ease-out',
        },
      },
    },
  }
  
  // In page components
  <main className="animate-fadeIn">
    <div className="animate-slideUp">
      {/* Content */}
    </div>
  </main>
  ```

- **Interactive Elements:**
  ```jsx
  // Example button hover effect
  <button
    className="bg-primary-500 text-white px-4 py-2 rounded
              hover:bg-primary-600 transform hover:scale-105 
              transition-all duration-200 ease-in-out"
  >
    Click me
  </button>
  ```

- **Navigation Interactions:**
  ```jsx
  // In BottomNav.tsx
  <Link
    className={`transition-all duration-200 ease-in-out
                ${active ? 'text-primary-600 transform scale-105' : 'text-neutral-500'}`}
  >
    {item.name}
  </Link>
  ```

### 4. Performance Considerations

- Use transform/opacity for animations when possible (better performance)
- Avoid animating layout properties like width/height
- Use `will-change` sparingly only when needed
- Test animations on lower-powered devices

## Migration Strategy

To efficiently transition from the current state-based navigation to the new route-based system:

### 1. One-Shot Approach

Since the application currently uses state-based navigation without URL routing, we will implement a full switchover to the new navigation system. This is possible because there are no existing URLs or bookmarks to preserve.

### 2. Component Adaptation

For existing components, the preferred approach is to:

1. Create page components that wrap existing functionality
2. Move data fetching from props to route-based fetching
3. Maintain the core functionality of existing components

Example:
```jsx
// src/app/more/all-time/page.tsx
'use client';
import AllTimeStats from '@/components/AllTimeStats';

export default function AllTimeStatsPage() {
  return <AllTimeStats />;
}
```

### 3. Implementation Order

1. Create the navigation components (BottomNav, SideNav)
2. Implement the core layout with these components
3. Create the basic page structure with routing
4. Integrate existing components into the page structure
5. Add deep linking and dynamic routes
6. Implement error handling and animations
7. Refine and test the user experience

## Performance Considerations

After implementation, monitor the following metrics to ensure optimal performance:

### 1. Page Load Metrics

- First Contentful Paint (FCP): < 1.8s target
- Largest Contentful Paint (LCP): < 2.5s target
- Time to Interactive (TTI): < 3.5s target
- Cumulative Layout Shift (CLS): < 0.1 target

### 2. Bundle Size

- Monitor JS bundle size increases
- Consider code splitting for larger components
- Lazy load components that aren't needed immediately

### 3. Mobile Performance

- Test on mid-range mobile devices
- Check for smooth scrolling
- Verify animation performance doesn't cause jank

### 4. Optimizations

- Use next/image for optimized image loading
- Implement loading states for all async operations
- Consider skeleton screens for content that takes time to load

## Fallback Plans

In case of any issues during implementation:

1. **Component Isolation:**
   - Build and test navigation components in isolation
   - Integrate with existing system gradually
   - Test thoroughly before full deployment

2. **Simplified First Version:**
   - Start with just the core navigation structure
   - Add animations and advanced features in subsequent updates

3. **Progressive Enhancement:**
   - Ensure the application works without animations
   - Add interactive enhancements only after core functionality is stable 

## Design Implementation

For implementing design aspects:

1. **Use Tailwind Classes Directly:**
   - Apply Tailwind classes directly rather than creating CSS variables
   - This ensures consistency and makes future application-wide changes easier
   - Follow the color system defined in `tailwind.config.js`

2. **Component Styling Approach:**
   - Use existing Tailwind utility classes for all styling
   - Follow the neutral color palette for text and backgrounds
   - Use the primary blue color for active states and important UI elements
   - Example button implementation:
   ```jsx
   <button className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors">
     Click Me
   </button>
   ```

3. **Shadow System Implementation:**
   - Use the shadow classes from the styling standards document:
     - Form elements: `shadow-sm`
     - Cards: `.card` class
     - Elevated elements: `.shadow-elevated`

### Mobile-Desktop Transitions

For transitioning between mobile and desktop views:

1. **Clean Breakpoint Transitions:**
   - Use appropriate media queries to handle window resizing
   - Ensure content doesn't jump or reflow during transition
   - Example implementation:
   ```css
   /* In globals.css or Tailwind classes */
   .navigation-container {
     @apply transition-all duration-300 ease-in-out