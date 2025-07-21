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
    trend_rating: number | null;
    trend_goal_threat: number | null;
    league_avg_goal_threat: number | null;
  }
  ```
- **Analysis:**
  - This type perfectly mirrors a database table (`aggregated_player_power_ratings`).
  - It confirms that the database uses `player_id` (as a number) and `snake_case`. The inconsistencies in the frontend are a result of some parts of the code using this database-like shape, while other parts use a more JavaScript-conventional `camelCase` shape with a string ID.

---

## Phase 2: Summary & Unification Plan

### Summary of Findings

The audit reveals there are **at least 5 unique shapes** for player data being used across the application, with numerous redundancies. The core problems are:

1.  **ID Type Conflict:** Player IDs are treated as `string` in some parts of the app (the canonical `Player` type) and `number` in others (most components and API responses). This is the most critical issue, stemming from a failure to consistently transform database-style types into frontend-style types.
2.  **Naming Convention Conflict:** Property names flip between `camelCase` (e.g., `isRinger`) and `snake_case` (e.g., `player_id`, `games_played`), another symptom of leaking database conventions into the frontend.
3.  **Redundant Definitions:** The same types (especially `PlayerStats` and `PlayerWithNameAndId`) are re-declared in multiple files instead of being shared.
4.  **Loose Typing:** The primary `Player` interface includes a `[key: string]: any;` index signature, which severely weakens type safety and hides potential bugs, such as the `Player` vs. `MatchPlayer` mismatch in `BalanceTeamsPane`.
5.  **Missing Properties:** The base `Player` type lacks a `club` property, which is then added in different shapes in `PlayerFormData` and `PlayerStats`.

### Unification Plan

To resolve these inconsistencies, a single source of truth for player types will be enforced. This plan aligns with the established `BerkoTNF Project Rules`.

#### Step 1: Define Canonical Player Types

The file `src/types/player.types.ts` is the single source of truth for all player-related interfaces.

```typescript
// src/types/player.types.ts

// The shape of a club, consistent across the app
export interface Club {
  id: string; // Club IDs are strings in the frontend
  name: string;
  filename: string;
}

// The absolute base representation of a player.
// This is the canonical type for all frontend components.
export interface PlayerProfile {
  id: string;
  name: string;
  isRinger: boolean;
  isRetired: boolean;
  club?: Club | null;
  // Core attributes are always camelCase
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
}

// A player with their calculated stats for a given season/period
export interface PlayerWithStats extends PlayerProfile {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  fantasyPoints: number;
  pointsPerGame: number;
}
```

**Key Principles of this Structure:**
- **`id` is `string`:** The canonical frontend type `PlayerProfile` uses `id: string`. This is for consistency with component keys, browser APIs, and general JavaScript best practices.
- **Database `id` is `number`:** The database uses `player_id: number` as its primary key.
- **Transformation at the Boundary:** The API layer is the designated boundary for data transformation. It is responsible for converting raw `snake_case` database results (with numeric IDs) into the clean, `camelCase` canonical types (with string IDs) before sending data to the frontend. This is handled by helpers in `src/lib/transform/player.transform.ts`.
- **Strictly `camelCase`:** All frontend properties are `camelCase`.
- **No More `any`:** The dangerous `[key: string]: any;` is removed to enforce strict typing.
- **Clear Hierarchy:** Context-specific types like `PlayerInPool` and `PlayerWithStats` extend the base `PlayerProfile`, promoting code reuse and clarity.

#### Step 2: Impact Analysis & Refactoring Path

Adopting these types requires changes across the codebase to ensure all parts adhere to the standard.

1.  **API & Transformation Layer:**
    - All API routes that return player data (`/api/players`, `/api/stats`, etc.) **must** use the transformation helpers in `src/lib/transform/player.transform.ts`.
    - These helpers are responsible for mapping `snake_case` to `camelCase` and, most importantly, converting the numeric `player_id` from the database into the `id: string` required by the frontend `PlayerProfile` type.

2.  **Type Consumption Layer (`team-algorithm.types.ts`):**
    - Any remaining `Player` interfaces in `src/types/team-algorithm.types.ts` must be deleted.
    - Other types in that file (`PlayerSlotProps`, `PlayerPoolProps`, etc.) must be updated to import and use the new canonical types from `src/types/player.types.ts`.
    - All logic that previously relied on `id` being a `number` must be updated to handle a `string`.

3.  **Component Layer:**
    - **`BalanceTeamsPane.component.tsx`**: The local `MatchPlayer` type must be removed. Props should be updated to use the canonical `PlayerInPool[]`, and any internal logic using `player_id` must be changed to `id`.
    - **`CurrentHalfSeason.component.tsx` & `OverallSeasonPerformance.component.tsx`**: Local `PlayerStats` definitions must be removed and replaced with an import for `PlayerWithStats`. The rendering logic must be updated to use the `camelCase` property names.
    - **All components using `PlayerWithNameAndId`**: Local definitions must be removed and replaced by importing `PlayerProfile`.

#### Step 3: Execution
- The process involves systematically working through the files listed above, replacing old/local types with the new canonical ones, and fixing any resulting errors from property name or ID type changes.
- This refactoring ensures the codebase is more robust, predictable, and easier to maintain.

This plan will resolve all identified inconsistencies and make the codebase significantly more robust and maintainable. 