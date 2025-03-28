# TypeScript Migration and Project Structure Reorganization Plan

## 1. New Folder Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin pages
│   ├── matchday/          # Matchday pages
│   ├── records/           # Records pages
│   ├── report/            # Report pages
│   └── season/            # Season pages
├── components/
│   ├── admin/             # Admin components
│   ├── layouts/           # Layout components
│   ├── match-report/      # Match report components
│   ├── navigation/        # Navigation components
│   ├── stats/             # Statistics components
│   ├── player/            # Player-related components
│   ├── records/           # Records components
│   └── ui-kit/            # UI components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── types/                 # TypeScript types
```

## 2. Component Migration Plan

### A. UI Components (Move to ui-kit/)

```
src/components/ui/
├── Button.js → ui-kit/Button.tsx
├── Card.js → ui-kit/Card.tsx
├── Table.js → ui-kit/Table.tsx
├── Tabs.js → ui-kit/Tabs.tsx
└── ConfirmationModal.js → ui-kit/ConfirmationModal.tsx
```

### B. Feature Components (Organize by feature)

```
src/components/
├── stats/
│   ├── AllTimeStats.js → AllTimeStats.tsx
│   ├── CurrentHalfSeason.js → CurrentHalfSeason.tsx
│   └── OverallSeasonPerformance.js → OverallSeasonPerformance.tsx
├── player/
│   └── PlayerProfile.js → PlayerProfile.tsx
├── records/
│   └── HonourRoll.js → HonourRoll.tsx
└── match-report/
    └── MatchReport.js → MatchReport.tsx
```

### C. Admin Components (Keep in admin/)

```
src/components/admin/
├── AdminLayout.js → AdminLayout.tsx
├── AdminNavbar.js → AdminNavbar.tsx
├── AdminPanel.js → AdminPanel.tsx
├── AppSetup/
│   ├── BalanceAlgorithmSetup.js → BalanceAlgorithmSetup.tsx
│   ├── FantasyPointsSetup.js → FantasyPointsSetup.tsx
│   ├── MatchReportSetup.js → MatchReportSetup.tsx
│   └── MatchSettingsSetup.js → MatchSettingsSetup.tsx
├── AttributeGuide.js → AttributeGuide.tsx
├── MatchManager.js → MatchManager.tsx
├── PlayerManager.js → PlayerManager.tsx
├── PlayerRatings.js → PlayerRatings.tsx
└── TeamAlgorithm.js → TeamAlgorithm.tsx
```

## 3. TypeScript Conversion Approach

1. **For each component:**
   - Create new .tsx file with PascalCase name
   - Add appropriate React component type (React.FC)
   - Define interfaces for props and state
   - Update imports to use new paths

2. **For each feature folder:**
   - Create an index.ts file to export components
   - Use named exports for better import management

3. **For shared types:**
   - Create files in the types/ directory
   - Define interfaces for common data structures
   - Export them for reuse across the application

## 4. Import Path Updates

1. **Update all imports to use the new paths:**
   - Replace direct imports with imports from index files where possible
   - Example: `import Button from '@/components/ui/Button'` → `import { Button } from '@/components/ui-kit'`

2. **Update relative imports:**
   - Use absolute paths with '@/' prefix for cleaner imports

## 5. Progress Tracking

| Component Category        | Status      |
|---------------------------|-------------|
| UI Components (ui-kit)    | In Progress |
| Stats Components          | In Progress |
| Player Components         | Not Started |
| Records Components        | Not Started |
| Match Report Components   | Not Started |
| Admin Components          | Not Started |
| App Files                 | In Progress |

## 6. Testing Checklist

- [ ] All component props are properly typed
- [ ] All state variables are properly typed
- [ ] All function parameters and return values are typed
- [ ] No any types except where absolutely necessary
- [ ] Import paths are correctly updated
- [ ] No TypeScript errors or warnings

## 7. Benefits

- Improved type safety
- Better code organization
- Enhanced developer experience with autocomplete
- Easier maintenance
- Consistent naming conventions (PascalCase)
- Clearer project structure 