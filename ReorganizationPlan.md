# BerkoTNF Codebase Reorganization Plan

## Overview

This document outlines a step-by-step plan to clean up the codebase structure without breaking existing functionality. The goal is to:

1. Remove duplicate/obsolete files
2. Complete the Pages Router to App Router migration
3. Standardize component naming conventions
4. Eliminate the nested src directory
5. Organize components by feature consistently

## Important Guidelines

- **NEVER DELETE** any file without verifying it's truly unused
- **TEST AFTER EACH STEP** to ensure functionality is maintained
- Use Git to track changes and allow rollback if needed
- When moving files, update all imports before committing changes
- If unsure about a file, mark it for review rather than modifying

## Phase 1: Initial Cleanup

### 1.1 Remove Backup Files

These files are explicitly marked as backups and safe to remove:

```
- TeamAlgorithm.js.backup (Root directory)
- src/components/admin/TeamAlgorithm_backup.md
```

### 1.2 Clean Up Duplicate TeamAlgorithm Components

The proper version already exists at `src/components/admin/team/TeamAlgorithm.component.tsx`, so any duplicates can be removed:

```
- src/components/admin/TeamAlgorithm.tsx (deprecated, now moved to team subdirectory)
```

## Phase 2: Eliminate Nested src Directory

The `src/src` directory contains duplicate components that should be merged with their counterparts in the main src directory.

### 2.1 Review Files in Nested src

Verify if any files in these directories contain unique functionality:
```
- src/src/components/layout/
- src/src/components/match-report/
- src/src/components/player/
- src/src/components/records/
```

### 2.2 Migration Plan for Nested Files

- If files in `src/src` are exact duplicates, simply delete them
- If files in `src/src` contain unique changes, compare with their counterparts and merge changes
- After confirming all functionality is preserved, delete the entire `src/src` directory

## Phase 3: Pages Router to App Router Migration

### 3.1 Review Remaining Pages Components

The following files in the Pages Router structure need migration to App Router:

```
- src/pages/admin/dashboard.tsx → src/app/admin/dashboard/page.tsx
- src/pages/admin/balance-algorithm.tsx → already migrated to src/app/admin/next-match/page.tsx
- src/pages/admin/app-setup.tsx → src/app/admin/setup/page.tsx
```

### 3.2 Migration Steps

For each file:
1. Compare functionality with any existing App Router counterparts
2. Update page component to work with App Router (remove any Pages Router specific code)
3. Update imports in all files that reference the old Pages Router paths
4. Test functionality to ensure behavior is identical
5. Only after successful testing, remove the original Pages Router file

## Phase 4: Standardize Component Naming

### 4.1 Rename Components to Follow Consistent Conventions

All component files should use the `.component.tsx` suffix:

```
- src/components/matchday/Matchday.tsx → src/components/matchday/Matchday.component.tsx
- src/components/admin/TeamTemplates.tsx → src/components/admin/team/TeamTemplates.component.tsx
- src/components/admin/AttributeGuide.tsx → src/components/admin/AttributeGuide.component.tsx
- src/components/admin/MatchManager.tsx → src/components/admin/matches/MatchManager.component.tsx
```

### 4.2 Update Import Statements

After renaming each file, update all import statements across the codebase:

1. Use grep to find all import statements for the renamed file
2. Update each import to use the new file path and naming convention
3. Test the application to ensure nothing breaks

## Phase 5: Reorganize by Feature

### 5.1 Move Components to Feature-Based Folders

Reorganize components into clear feature-based directories:

```
- src/components/admin/AttributeGuide.tsx → src/components/admin/player/AttributeGuide.component.tsx
- src/components/admin/MatchManager.tsx → src/components/admin/matches/MatchManager.component.tsx
```

### 5.2 Organize Generic Utils

Improve naming and organization of utility files:

```
- src/lib/utils.ts → Split into specific utility files based on functionality
```

## Phase 6: Review and Clean Up

### 6.1 Review index.ts Exports

Ensure all index.ts files correctly export their components:

1. Check all index.ts files in the components directory
2. Update exports to match the new file names and locations
3. Remove any exports for files that no longer exist

### 6.2 Review for Unused Components

Check for components that are explicitly marked as unused or not imported anywhere:

```
- src/components/admin/player/PlayerSlot.component.tsx (marked as unused)
```

### 6.3 Final Testing

After all reorganization steps are complete:
1. Run a full build of the application
2. Test all major features to ensure functionality is maintained
3. Check for any console errors that might indicate missing files

## Execution Checklist

- [ ] Back up the entire codebase before starting
- [ ] Complete Phase 1: Initial Cleanup
- [ ] Complete Phase 2: Eliminate Nested src Directory
- [ ] Complete Phase 3: Pages Router to App Router Migration
- [ ] Complete Phase 4: Standardize Component Naming 
- [ ] Complete Phase 5: Reorganize by Feature
- [ ] Complete Phase 6: Review and Clean Up
- [ ] Final full application testing

## Notes on Specific Components

### TeamAlgorithm Component

This component is particularly important and referenced in multiple places:
- Referenced in `src/app/admin/next-match/page.tsx`
- Imported in `src/components/admin/index.ts`
- Used in `src/components/admin/layout/AdminPanel.component.tsx`

Take extra care when modifying anything related to this component.

### Breaking Change Risks

The following changes have higher risk of breaking functionality:
1. Changing any API route paths
2. Removing utility functions that might be used in multiple places
3. Renaming or moving core layout components

Take extra precautions and perform targeted testing when handling these areas. 