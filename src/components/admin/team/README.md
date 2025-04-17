# Team Algorithm Component

## Overview

This directory contains the team balancing algorithm component. The implementation provides a modern, hook-based architecture for managing team creation and balancing.

## Architecture

The component uses a clean, hook-based architecture:

- **Types**: All TypeScript interfaces and types are centralized in `@/types/team-algorithm.types.ts`
- **Constants**: Configuration values are extracted to `@/constants/team-algorithm.constants.ts`
- **Utils**: Pure helper functions are moved to `@/utils/team-algorithm.utils.ts`
- **Services**: Core business logic is encapsulated in `@/services/TeamBalanceService.ts`
- **UI Components**: Broken down into small, focused components in `/components/team/`
- **Custom Hooks**: State management logic is extracted to hooks in `/hooks/`

## Component Files

- `TeamAlgorithmWrapper.component.tsx` - Main entry point wrapper
- `NewTeamAlgorithm.component.tsx` - Main implementation

## Features

The TeamAlgorithm component allows administrators to:

1. Create and assign teams for football/soccer matches
2. Automatically balance teams based on player skills
3. Manually adjust player positions
4. View team statistics and balance metrics
5. Add temporary "ringer" players
6. Create and manage matches

## Team Structure

The component maintains a standard team structure:

- **Orange Team**: Slots 1-9
- **Green Team**: Slots 10-18
- **Positions**: Defenders, Midfielders, Attackers (dynamically adjusted based on team size)

## API Endpoints

The component uses the following API endpoints:

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

## Testing

Key areas to verify when making changes:

1. Player assignment and team balancing functionality
2. Drag and drop interactions
3. API integration
4. Error handling
5. UI responsiveness
6. Performance metrics 