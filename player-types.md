# Player Type Audit & Unification Plan

This document audits all `Player` and player-related types across the codebase to identify inconsistencies and propose a unified, canonical type definition.

## Phase 1: Discovery & Analysis

*This section details each discovered player-related type, its properties, and where it's used.*

---

### 1. The `team-algorithm.types.ts` Set

This file appears to contain the most central and widely-used definitions related to players.

#### a. `Player`

- **File:** `src/types/team-algorithm.types.ts`
- **Definition:**
  ```typescript
  export interface Player {
    id: string;
    name: string;
    goalscoring?: number;
    defending?: number;
    stamina_pace?: number;
    control?: number;
    teamwork?: number;
    resilience?: number;
    is_ringer?: boolean;
    is_retired?: boolean;
    [key: string]: any; // <-- Inconsistency / Code Smell
  }
  ```
- **Analysis:**
  - This seems to be the **base model for a player**, containing core attributes and skills.
  - The optional nature of the skill attributes suggests it's used in contexts where full stats may not be available.
  - **🚨 Major Issue:** The index signature `[key: string]: any;` effectively disables type checking for any properties not explicitly listed, making the type very loose and potentially hiding bugs. It's a prime candidate for removal or refinement.

#### b. `PoolPlayer`

- **File:** `src/types/team-algorithm.types.ts`
- **Definition:**
  ```typescript
  export interface PoolPlayer extends Player {
    response_status?: 'IN' | 'OUT' | 'MAYBE' | 'PENDING';
    pool_id?: number; // ID in the match_player_pool table
  }
  ```
- **Analysis:**
  - This is a good example of type composition. It correctly extends the base `Player` to add context-specific information for when a player is part of a match pool.
  - This shows a clear, hierarchical relationship.

#### c. `PlayerFormData`

- **File:** `src/types/team-algorithm.types.ts`
- **Definition:**
  ```typescript
  export interface PlayerFormData {
    name: string;
    is_ringer: boolean;
    is_retired: boolean;
    goalscoring: number;
    defending: number;
    stamina_pace: number;
    control: number;
    teamwork: number;
    resilience: number;
    selected_club?: { id: string; name: string; filename: string; search: string; league: string; country: string; } | null;
  }
  ```
- **Analysis:**
  - This type is for the player create/edit form.
  - **Inconsistency:** It duplicates all the properties from `Player` instead of extending or picking from it.
  - **Difference:** The skill attributes are **required** (`number`), whereas they are **optional** (`number?`) in the main `Player` type.
  - **Difference:** It introduces a `selected_club` property, which is absent from the base `Player` type. This suggests the core `Player` model is missing a `club` relationship.

#### d. Consumers of these types in the same file

- **`PlayerSlotProps`**: Consumes `Player`.
- **`PlayerPoolProps`**: Consumes `Player`.
- **`DraggablePlayerSlotProps`**: Consumes `Player`.
- **`DragItem`**: Consumes `Player`.

---

### 2. The `MatchPlayer` Inconsistencies

A competing and inconsistent player type named `MatchPlayer` appears in multiple places, creating redundancy and a potential for bugs.

#### a. `MatchPlayer` (in `useMatchState.hook.ts`)

- **File:** `src/hooks/useMatchState.hook.ts`
- **Definition:**
  ```typescript
  interface MatchPlayer {
    player_id: number;
    name: string;
    team?: 'A' | 'B' | 'Unassigned';
    // ... other player attributes
  }
  ```
- **Analysis:**
  - **🚨 Major Issue:** This interface is **defined but never used** within the hook. The hook's state correctly uses `Player[]` from `team-algorithm.types.ts`. This is dead, misleading code.
  - **Inconsistency:** It uses `player_id: number`, which directly conflicts with the canonical `Player` type's `id: string`.
  - **Inconsistency:** It uses `snake_case` for `player_id`, violating the common `camelCase` convention used elsewhere.

#### b. `MatchPlayer` (in `BalanceTeamsPane.component.tsx`)

- **File:** `src/components/admin/matches/BalanceTeamsPane.component.tsx`
- **Definition:**
  ```typescript
  interface MatchPlayer {
    player_id: number;
    name: string;
    team?: 'A' | 'B' | 'Unassigned';
  }
  ```
- **Analysis:**
  - **Redundancy:** This is a second, separate definition of `MatchPlayer`. It should be defined once in a shared types file.
  - **Inconsistency:** Like the other `MatchPlayer`, it uses `player_id: number` and `snake_case`.
  - **🚨 Major Issue / Bug:** The component receives a prop `lockedPlayers: MatchPlayer[]`. However, the parent page (`/app/admin/matches/[id]/page.tsx`) passes the `players` array from the `useMatchState` hook, which is of type `Player[]`. This is a direct type mismatch (`id: string` vs `player_id: number`). It likely "works" due to implicit `any` casting or the loose index signature on the `Player` type, but it is incorrect and unsafe.

---

### 3. The `PlayerStats` Duplication

A specific, view-oriented player type is duplicated across two major components.

- **Files:**
  - `src/components/tables/CurrentHalfSeason.component.tsx`
  - `src/components/tables/OverallSeasonPerformance.component.tsx`
- **Definition:**
  ```typescript
  interface PlayerStats {
    name: string;
    player_id: number;
    games_played: number;
    wins: number;
    // ... and 10 other stat-related properties
    selected_club?: {
      name: string;
      filename: string;
    } | null;
  }
  ```
- **Analysis:**
  - **Redundancy:** The exact same interface is defined in two separate component files. This should be extracted into a shared types file (e.g., `src/types/stats.types.ts`).
  - **Inconsistency:** This type continues the pattern of using `player_id: number` and `snake_case` for properties, which conflicts with the canonical `Player` type.
  - **Context:** This type represents the shape of data returned from the stats-related API endpoints (`/api/stats/half-season` and `/api/stats`). It's not a general-purpose player model, but a specific projection of player data for leaderboards.
  - **Inconsistency (`selected_club`):** The shape of `selected_club` here is different from its shape in `PlayerFormData`, indicating multiple ways of representing the same relationship.

---

### 4. The `PlayerWithNameAndId` Proliferation

A minimal player type is defined independently in at least five different components, highlighting a clear need for a shared type.

- **Files:**
  - `src/components/records/Legends.component.tsx`
  - `src/components/records/LeaderboardStats.component.tsx`
  - `src/components/records/Feats.component.tsx`
  - `src/components/dashboard/Milestones.component.tsx`
  - `src/components/dashboard/MatchReport.component.tsx`
- **Definition:**
  ```typescript
  interface PlayerWithNameAndId {
    id: number;
    name: string;
  }
  ```
- **Analysis:**
  - **Redundancy:** This is the most frequently re-implemented interface. It provides basic player identification, likely for creating links or displaying names. It should be defined once in a shared types file.
  - **Inconsistency:** This type consistently uses `id: number`, which further solidifies the conflict with the `Player` type from `team-algorithm.types.ts` that uses `id: string`.
  - **Data Source:** Components using this type often fetch data from the `/api/players` endpoint, which implies this endpoint returns player IDs as `number`. This points to a fundamental inconsistency in how the player ID is handled between the database/API layer and the client-side application logic.

---

### 5. Server-Side & Utility Types

A few other player-related types exist on the backend, further confirming the source of the inconsistencies.

- **File:** `src/app/api/admin/balance-by-past-performance/utils.ts`
- **Definition:**
  ```typescript
  export interface PlayerRating {
    player_id: number;
    rating: number | null;
    variance: number | null;
    goal_threat: number | null;
    defensive_shield: number | null;
  }
  ```
- **Analysis:**
  - This type perfectly mirrors a database table (`aggregated_player_power_ratings`).
  - It confirms that the database uses `player_id` (as a number) and `snake_case`. The inconsistencies in the frontend are a result of some parts of the code using this database-like shape, while other parts use a more JavaScript-conventional `camelCase` shape with a string ID.

---

## Phase 2: Summary & Unification Plan

### Summary of Findings

The audit reveals there are **at least 5 unique shapes** for player data being used across the application, with numerous redundancies. The core problems are:

1.  **ID Type Conflict:** Player IDs are treated as `string` in some parts of the app (the "main" `Player` type) and `number` in others (most components and API responses). This is the most critical issue.
2.  **Naming Convention Conflict:** Property names flip between `camelCase` (e.g., `is_ringer`) and `snake_case` (e.g., `player_id`, `games_played`).
3.  **Redundant Definitions:** The same types (especially `PlayerStats` and `PlayerWithNameAndId`) are re-declared in multiple files instead of being shared.
4.  **Loose Typing:** The primary `Player` interface includes a `[key: string]: any;` index signature, which severely weakens type safety and hides potential bugs, such as the `Player` vs. `MatchPlayer` mismatch in the `BalanceTeamsPane`.
5.  **Missing Properties:** The base `Player` type lacks a `club` property, which is then added in different shapes in `PlayerFormData` and `PlayerStats`.

### Unification Plan

A refactor is recommended to unify these types. This will improve code quality, reduce bugs, and make future development easier.

#### Step 1: Define Canonical Player Types

Create a new file, `src/types/player.types.ts`, to be the single source of truth for all player-related interfaces.

```typescript
// src/types/player.types.ts

// The shape of a club, consistent across the app
export interface Club {
  id: number; // Or string, must be consistent
  name: string;
  filename: string;
}

// The absolute base representation of a player
// Corresponds to the `players` table in the database
export interface PlayerProfile {
  id: number; // <-- Decision: Unify on `number` as it matches the DB.
  name: string;
  isRinger: boolean;
  isRetired: boolean;
  club?: Club | null;
  // Core attributes should be camelCase
  goalscoring: number;
  defending: number;
  staminaPace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

// A player in the context of a match pool
export interface PlayerInPool extends PlayerProfile {
  responseStatus: 'IN' | 'OUT' | 'MAYBE' | 'PENDING';
  // Note: player_id is now just `id` from the extended type
}

// A player with their calculated stats for a given season/period
export interface PlayerWithStats extends PlayerProfile {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  // ... other stats, all converted to camelCase
  fantasyPoints: number;
  pointsPerGame: number;
}
```

**Key Decisions in this structure:**
- **ID is `number`:** We will standardize on `number` for all player IDs to match the database, eliminating the string/number conflict.
- **Strictly `camelCase`:** All properties are `camelCase`. API data will be transformed on receipt to match this.
- **No More `any`:** The dangerous `[key: string]: any;` is removed.
- **Clear Hierarchy:** Specific types (`PlayerInPool`, `PlayerWithStats`) extend the base `PlayerProfile`, promoting reuse.
- **Shared `Club` type:** A single `Club` interface is defined.

#### Step 2: Impact Analysis & Refactoring Path

Adopting these types will require changes across the codebase.

1.  **API Layer:**
    - All API routes that return player data (`/api/players`, `/api/stats`, etc.) must be updated. They should fetch data using `snake_case` from Supabase but then transform the keys to `camelCase` and ensure `id` is a `number` before sending the JSON response. This provides a clean, consistent API contract for the frontend.

2.  **Type Consumption Layer (`team-algorithm.types.ts`):**
    - The old `Player` interface in `src/types/team-algorithm.types.ts` should be deleted.
    - Other types in that file (`PlayerSlotProps`, `PlayerPoolProps`, etc.) should be updated to import and use the new `PlayerProfile` or `PlayerInPool` from `src/types/player.types.ts`.
    - Any logic that relied on `id` being a `string` must be updated (e.g., `id.toString()`).

3.  **Component Layer:**
    - **`BalanceTeamsPane.component.tsx`**: The local `MatchPlayer` type will be removed. The props will be updated to use the new `PlayerInPool[]`, and any internal logic using `player_id` will be changed to `id`. This will fix the hidden bug.
    - **`CurrentHalfSeason.component.tsx` & `OverallSeasonPerformance.component.tsx`**: Remove the local `PlayerStats` definition and import `PlayerWithStats`. Update the rendering logic to use the new `camelCase` property names.
    - **All components using `PlayerWithNameAndId`**: Remove the local definition and import `PlayerProfile`. The necessary properties (`id`, `name`) are already on it.
    - **`useMatchState.hook.ts`**: The unused `MatchPlayer` type will be deleted. The hook's state will use `PlayerInPool[]`.

#### Step 3: Execution (To be done after approval)
- Create `src/types/player.types.ts`.
- Systematically work through the files listed above, replacing old types with the new canonical ones and fixing any resulting errors (e.g., property name changes, ID type changes).
- This can be done incrementally, starting with the API layer to ensure the data source is correct.

This plan will resolve all identified inconsistencies and make the codebase significantly more robust and maintainable. 