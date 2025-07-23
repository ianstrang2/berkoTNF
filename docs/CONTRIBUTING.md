# Contributing to BerkoTNF

Thank you for your interest in contributing to BerkoTNF. This document outlines our coding standards and conventions to maintain consistency across the codebase.

## Code Organization

We organize our codebase by feature rather than by type. This means that related components, hooks, and utilities are grouped together in feature-specific directories.

### Directory Structure

```
src/
├── app/                    # App Router pages and layouts (Next.js 13+)
│   ├── admin/             # Admin routes (/admin/*)
│   ├── records/           # Records routes (/records/*)
│   ├── table/             # Table routes (/table/*)
│   ├── upcoming/          # Upcoming fixtures route
│   └── api/               # API routes
├── components/            # React components organized by feature
│   ├── admin/             # Admin-related components
│   ├── dashboard/         # Dashboard page + dashboard widgets
│   │   ├── Dashboard      # Main dashboard component
│   │   ├── PersonalBests  # Personal bests widget
│   │   ├── Milestones     # Milestones widget
│   │   └── MatchReport    # Latest match widget
│   ├── layout/            # Layout components (MainLayout, etc.)
│   ├── navigation/        # Navigation components (DesktopSidebar, BottomNavigation, etc.)
│   ├── player/            # Player-related components
│   ├── records/           # All-time records & achievements (standalone pages)
│   │   ├── LeaderboardStats # All-time player statistics
│   │   ├── Legends        # Hall of fame / season winners
│   │   └── Feats          # Notable achievements/records
│   ├── tables/            # Season standings/tables
│   │   ├── CurrentHalfSeason # Half season table
│   │   └── OverallSeasonPerformance # Whole season table
│   ├── team/              # Team-related components
│   ├── ui-kit/            # Reusable UI components
│   └── ...                # Other feature-specific directories
├── contexts/              # React Context providers (NavigationContext, etc.)
├── hooks/                 # Custom React hooks
├── services/              # Business logic and API services
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

### App vs Components Directory

Understanding the relationship between `/app` and `/components`:

**`/app` Directory (Routes)**
- Defines URL routes using Next.js 13+ App Router
- Each `page.tsx` file creates a new route
- Example: `/app/table/half/page.tsx` → `localhost:3000/table/half`
- Contains minimal logic - mainly imports and renders components

**`/components` Directory (Reusable Components)**
- Contains the actual UI components and business logic
- Components are imported and used by pages in `/app`
- Organized by feature for better maintainability
- Example: `/components/stats/CurrentHalfSeason.component.tsx`

**Typical Flow:**
```typescript
// /app/table/half/page.tsx (Route)
import { CurrentHalfSeason } from '@/components/stats';

export default function TableHalfPage() {
  return <CurrentHalfSeason initialView="points" />;
}

// /components/stats/CurrentHalfSeason.component.tsx (Component)
export const CurrentHalfSeason = ({ initialView }) => {
  // Component logic and UI here
};
```

### Backend and Database Assets

In addition to the frontend application code in `src/`, this project also includes backend logic and database scripts managed within the repository:

```
supabase/
├── functions/       # Source code for Supabase Edge Functions
│   ├── call-update-all-time-stats/
│   │   └── index.ts # Example Edge Function
│   └── ...          # Other Edge Functions
sql/                 # SQL scripts, often used by Edge Functions or for migrations
├── update_aggregated_all_time_stats.sql # Example SQL script
└── ...              # Other SQL files
```

-   **Supabase Edge Functions** are located in `supabase/functions/`. Each function typically resides in its own subdirectory.
-   **SQL Scripts** used for database operations (e.g., creating views, updating aggregated tables, migrations) are located in the `sql/` directory.
-   These assets are typically deployed to Supabase via a separate script or process.

## Naming Conventions

We follow a consistent naming pattern for all files:

| File Type | Pattern | Example |
|-----------|---------|---------|
| Components | `{ComponentName}.component.tsx` | `Button.component.tsx` |
| Pages | `{PageName}.page.tsx` | `Dashboard.page.tsx` |
| Layouts | `{LayoutName}.layout.tsx` | `Admin.layout.tsx` |
| Hooks | `use{HookName}.hook.ts` | `useAuth.hook.ts` |
| Utilities | `{utilName}.util.ts` | `date.util.ts` |
| Services | `{ServiceName}.service.ts` | `TeamBalance.service.ts` |

## Import Conventions

- Import UI components individually from their specific files, not using barrel exports
- Use absolute imports with `@/` prefix for imports from the `src` directory

```typescript
// Good
import Button from '@/components/ui-kit/Button.component';
import Card from '@/components/ui-kit/Card.component';

// Avoid
import { Button, Card } from '@/components/ui-kit';
```

## React Conventions

- Add the `'use client'` directive at the top of components that need client-side interactivity
- Use functional components with hooks
- Use TypeScript interfaces for component props
- Prefer explicit prop types over using `React.FC<Props>`

```typescript
// Good
'use client';
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const Button = ({ children, onClick, disabled = false }: ButtonProps) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;
```

## App Router

We've migrated from Pages Router to App Router. All new pages should be created following the App Router conventions:

- Pages should be created in the `app` directory
- Use layout components for shared UI across pages
- Implement loading and error states using React Suspense and Error Boundaries

## Commits and Pull Requests

- Use descriptive commit messages that explain the changes made
- Reference issue numbers in commit messages when applicable
- Keep pull requests focused on a single task or feature
- Update documentation when necessary

## Testing

- Write unit tests for business logic and utilities
- Write component tests for UI components
- Ensure all tests pass before submitting a pull request

---

These conventions help maintain a consistent codebase and make it easier for contributors to understand and navigate the project. Thank you for adhering to these guidelines! 