# Team Algorithm Component Refactoring

## Overview

This directory contains the refactored TeamAlgorithm component. The refactoring was done incrementally to ensure 100% preservation of existing functionality while improving code organization, maintainability, and performance.

## Architecture

The refactored component uses a modern, hook-based architecture:

- **Types**: All TypeScript interfaces and types are centralized in `@/types/team-algorithm.types.ts`
- **Constants**: Configuration values are extracted to `@/constants/team-algorithm.constants.ts`
- **Utils**: Pure helper functions are moved to `@/utils/team-algorithm.utils.ts`
- **Services**: Core business logic is encapsulated in `@/services/TeamBalanceService.ts`
- **UI Components**: Broken down into small, focused components in `/components/team/`
- **Custom Hooks**: State management logic is extracted to hooks in `/hooks/`

## Component Files

- `TeamAlgorithm.component.tsx` - Main entry point that uses the feature-flag wrapper
- `TeamAlgorithmWrapper.component.tsx` - Toggles between old and new implementations
- `LegacyTeamAlgorithm.component.tsx` - Original implementation (for fallback)
- `NewTeamAlgorithm.component.tsx` - Refactored implementation

## Features

The TeamAlgorithm component allows administrators to:

1. Create and assign teams for football/soccer matches
2. Automatically balance teams based on player skills
3. Manually adjust player positions
4. View team statistics and balance metrics
5. Add temporary "ringer" players
6. Create and manage matches

## Team Structure

The component maintains the original team structure:

- **Orange Team**: Slots 1-9
- **Green Team**: Slots 10-18
- **Positions**: Defenders, Midfielders, Attackers (dynamically adjusted based on team size)

## API Endpoints

All original API endpoints are preserved:

- `/api/admin/players` - Get all players
- `/api/admin/upcoming-matches?active=true` - Get active match
- `/api/admin/upcoming-match-players` - CRUD operations for player assignments
- `/api/admin/upcoming-match-players/clear` - Clear all player assignments
- `/api/admin/clear-active-match` - Clear the active match
- `/api/admin/create-planned-match` - Create a new match
- `/api/admin/add-ringer` - Add a temporary player
- `/api/admin/matches?limit=1` - Get the last match
- `/api/admin/settings` - Get system settings
- `/api/admin/balance-planned-match` - Balance teams algorithmically

## Deployment Strategy

The refactored component is deployed using a feature flag approach:

1. Both old and new implementations exist side-by-side
2. A feature flag in `config/feature-flags.ts` controls which implementation is used
3. This allows for easy rollback if any issues are found
4. Once the new implementation is proven stable, the old implementation can be removed

## Development

To switch between implementations during development:

```typescript
// In src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_TEAM_ALGORITHM: true // Set to true to use new implementation
};
```

## Testing

A comprehensive testing checklist is included in the refactoring plan. Key areas to verify:

1. Player assignment and team balancing functionality
2. Drag and drop interactions
3. API integration
4. Error handling
5. UI responsiveness
6. Performance metrics 