# Awards Specification

**Version:** 1.0.0  
**Last Updated:** December 18, 2025  
**Status:** Implemented  
**Split from:** SPEC_Chat_And_Voting.md (v1.4.0)

---

## Overview

Player awards provide recognition and fun post-match content. Two types exist:

| Type | Awards | Source | Persistence |
|------|--------|--------|-------------|
| **System-Generated** | On Fire 🔥, Grim Reaper 💀 | Calculated from match streaks | Single "current holder" in `aggregated_match_report` |
| **Voted** | MoM 💪, DoD 🫏, MiA 🦝 | Post-match player voting | Historical records in `player_awards` table |

---

## All 5 Awards

| Award | Icon | Emoji (copy/paste) | Description | Default |
|-------|------|-------------------|-------------|---------|
| On Fire | `icon_on_fire.png` | 🔥 | Player on a win/goal streak | ON |
| Grim Reaper | `icon_reaper.png` | 💀 | Player on a losing streak | ON |
| Man of the Match (MoM) | `icon_mom.png` | 💪 | Best player (voted) | ON |
| Donkey of the Day (DoD) | `icon_donkey.png` | 🫏 | Worst performance (voted) | ON |
| Missing in Action (MiA) | `icon_possum.png` | 🦝 | Invisible player (voted) | OFF |

---

## Display Locations

Icons appear next to player names in these locations:

| Location | Component | On Fire | Grim Reaper | MoM | DoD | MiA |
|----------|-----------|---------|-------------|-----|-----|-----|
| Match Report (team lists) | `MatchReport.component.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Match Report (copy text) | `formatMatchReportForCopy()` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Half-Season Stats table | `CurrentHalfSeason.component.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Season Stats table | `OverallSeasonPerformance.component.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Teams Share (MCC) | `BalanceTeamsPane.component.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Match Awards section | `VotingResults.component.tsx` | ❌ | ❌ | ✅ | ✅ | ✅ |
| Current Form section | `CurrentForm.component.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Config Settings

### System-Generated Awards

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `show_on_fire` | boolean | true | Show On Fire icon |
| `show_grim_reaper` | boolean | true | Show Grim Reaper icon |

**Config group:** `match_report`

### Voted Awards

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `voting_enabled` | boolean | true | Master toggle for voting |
| `voting_mom_enabled` | boolean | true | Enable MoM voting |
| `voting_dod_enabled` | boolean | true | Enable DoD voting |
| `voting_mia_enabled` | boolean | false | Enable MiA voting |
| `voting_duration_hours` | number | 12 | Hours voting stays open |

**Config group:** `voting`

---

## Config-Based Display Logic (IMPORTANT)

### On Fire / Grim Reaper

**Pattern:** Component-level filtering

Each display component:
1. Loads `match_report` config group
2. Checks `show_on_fire` / `show_grim_reaper` config
3. Only shows icon if config is `true`

Data is always calculated and stored in `aggregated_match_report`, but display is controlled by config.

### Voting Awards (MoM, DoD, MiA)

**Pattern:** API-level filtering

The APIs filter awards based on current config before returning data:

**`/api/latest-player-status`** (used by teams share, player tables):
- Checks `voting_enabled` - if false, returns empty `voting_awards`
- Checks individual category configs - only returns enabled categories
- Returns `voting_enabled: boolean` flag

**`/api/voting/results/[matchId]`** (used by Match Awards section, Match Report):
- Checks `voting_enabled` - if false, returns `{ hasWinners: false }`
- Filters `enabledCategories` to only currently-enabled categories
- VotingResults component hides when no winners

### Behavior When Config Changes

| Scenario | Result |
|----------|--------|
| Turn off `voting_enabled` | Match Awards section hides, no voting icons anywhere |
| Turn off `voting_mom_enabled` | MoM icons stop showing (DoD/MiA still show if enabled) |
| Turn off `show_on_fire` | On Fire icon stops showing (data still calculated) |

**Historical data is NOT deleted** - it's preserved in the database. Display is simply filtered by current config.

---

## Data Sources

### System-Generated Awards

**Table:** `aggregated_match_report`

| Column | Type | Description |
|--------|------|-------------|
| `on_fire_player_id` | int | Current On Fire holder |
| `grim_reaper_player_id` | int | Current Grim Reaper holder |

Calculated by `/sql/update_aggregated_match_report_cache.sql` based on streak logic.

**API:** `/api/latest-player-status`

### Voted Awards

**Tables:**

```sql
-- Survey records (per match)
match_surveys:
  - id, tenant_id, match_id, upcoming_match_id
  - eligible_player_ids (snapshotted at creation)
  - enabled_categories (snapshotted at creation)
  - is_open, voting_closes_at, closed_at, results

-- Individual votes (during open voting)
match_votes:
  - survey_id, voter_player_id, award_type, voted_for_player_id
  - UNIQUE(survey_id, voter_player_id, award_type)

-- Historical award records (after voting closes)
player_awards:
  - player_id, match_id, survey_id, award_type
  - vote_count, is_co_winner
```

**Current holder query pattern:**
```sql
-- Awards from the most recent completed survey
SELECT pa.player_id, pa.award_type, pa.is_co_winner
FROM player_awards pa
WHERE pa.tenant_id = ?
  AND pa.survey_id = (
    SELECT ms.id FROM match_surveys ms
    JOIN matches m ON ms.match_id = m.match_id
    WHERE ms.tenant_id = ? AND ms.is_open = false
    ORDER BY m.match_date DESC, m.match_id DESC
    LIMIT 1
  );
```

---

## Voting Lifecycle

```
Match result entered (latest match only)
           │
           ▼
   ┌───────────────┐
   │ Survey Created │ ← Player list snapshotted
   │   is_open=true │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │ Voting Active │ ← Players vote/change votes
   │  (12 hours)   │
   └───────┬───────┘
           │
           ▼ (timer expires or cron closes)
   ┌───────────────┐
   │ Survey Closed │ ← Awards calculated, stored
   │ is_open=false │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │ Awards Display│ ← Icons appear by winner names
   └───────────────┘
```

### Survey Creation Rules (CRITICAL)

Survey is created **ONLY** when ALL conditions are true:
1. **First-time result submission** - `result_submitted_at` transitions NULL → timestamp
2. **Latest match** - Chronologically most recent
3. **Voting enabled** - `voting_enabled = true` in config
4. **No existing survey** - No `match_surveys` row for this match

Survey is **NEVER** created on: match edits, re-saves, historical edits, manual stats reruns.

### Survey Closing

**Hybrid approach:** Cron job (every 30 min) + lazy evaluation on access.

`closeSurvey()` in `src/lib/voting/closeSurvey.ts` is single source of truth:
1. Tally votes per category
2. Determine winners (ties = co-winners)
3. Insert `player_awards` records
4. Update survey: `is_open = false`
5. Post system message to chat

---

## Voting Rules

| Rule | Setting |
|------|---------|
| Voting window | 12 hours default (configurable) |
| Who can vote | Only players who played in that match |
| Who can be voted for | Only players who played in that match |
| Self-voting | Allowed |
| Skip categories | Allowed |
| Change votes | Allowed until voting closes |
| Ties | Co-winners (both get award) |

---

## API Routes

### Player Status (Current Holders)

```
GET /api/latest-player-status

Response:
{
  on_fire_player_id: string | null,
  grim_reaper_player_id: string | null,
  voting_awards: {
    mom: [{ player_id: string, is_co_winner: boolean }],
    dod: [...],
    mia: [...]
  },
  voting_enabled: boolean
}
```

**Note:** Filters awards based on current config settings.

### Voting Results (Match-Specific)

```
GET /api/voting/results/[matchId]

Response (voting enabled):
{
  success: true,
  hasSurvey: true,
  votingOpen: false,
  hasWinners: boolean,
  enabledCategories: ['mom', 'dod'],  // Only currently-enabled
  results: {
    mom: { winners: [...], totalVotes: number },
    dod: { winners: [...], totalVotes: number }
  }
}

Response (voting disabled):
{
  success: true,
  hasSurvey: false,
  hasWinners: false,
  votingEnabled: false
}
```

### Voting Actions

```
GET  /api/voting/active          - Get active survey for current user
POST /api/voting/submit          - Submit/update votes
POST /api/voting/close-expired   - Cron job to close expired surveys
```

---

## UI Components

### Voting Components

```
src/components/voting/
├── VotingBanner.component.tsx    # "Vote Now" banner on dashboard
├── VotingModal.component.tsx     # Multi-step voting flow
├── VotingResults.component.tsx   # Match Awards section
└── index.ts
```

### VotingResults Visibility

Component returns `null` (hides) when:
- Loading
- No voting data (`hasSurvey: false`)
- No winners (`hasWinners: false`)
- `voting_enabled = false` (filtered at API level)

### Icon Assets

**Location:** `public/img/player-status/`

**Large circular images (56px)** - for section headers:
- `mom.png`, `donkey.png`, `possum.png`
- `on-fire.png`, `reaper.png`

**Small inline icons (20px, `w-5 h-5`)** - next to player names:
- `icon_mom.png`, `icon_donkey.png`, `icon_possum.png`
- `icon_on_fire.png`, `icon_reaper.png`

---

## React Query Hooks

### useLatestPlayerStatus

```typescript
// src/hooks/queries/useLatestPlayerStatus.hook.ts
export function useLatestPlayerStatus() {
  // Returns: on_fire_player_id, grim_reaper_player_id, voting_awards, voting_enabled
  // Cached for 5 minutes (staleTime)
}
```

### useVotingResults

```typescript
// src/hooks/queries/useVotingResults.hook.ts
export function useVotingResults() {
  // Returns results for the current match (from useMatchReport)
  // Cached for 5 minutes
}
```

---

## Copy/Paste Text Format

### Match Report Copy

```
⚽️ MATCH REPORT: 11 December 2025 ⚽️

FINAL SCORE: Orange 4 - 3 Green

--- ORANGE ---
Players: Bob, Cal 💪, Ian 🔥, Coops 💀, Scott, Greg, Nick, Russ, Dave

--- GREEN ---
Players: Sean, Alex, Ali, Martin, Youngy, Finn, Simon 🦝, Jude, Rory

--- MATCH AWARDS ---
- Man of the Match: Cal McKay
- Missing in Action: Simon Gill
```

### Teams Share (Match Control Centre)

```
--- ORANGE ---
Bob Craddock
Cal McKay 💪
Ian Strang 🔥
Coops 💀
...

--- GREEN ---
Simon Gill 🦝
...
```

---

## Database Schema (Voting)

```sql
-- Post-match surveys
CREATE TABLE match_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE SET NULL,
  upcoming_match_id INTEGER NOT NULL REFERENCES upcoming_matches(upcoming_match_id) ON DELETE CASCADE,
  eligible_player_ids INTEGER[] NOT NULL,
  enabled_categories TEXT[] NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  voting_closes_at TIMESTAMPTZ NOT NULL,
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, match_id)
);

-- Individual votes
CREATE TABLE match_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  survey_id UUID NOT NULL REFERENCES match_surveys(id) ON DELETE CASCADE,
  voter_player_id INTEGER NOT NULL,
  award_type TEXT NOT NULL CHECK (award_type IN ('mom', 'dod', 'mia')),
  voted_for_player_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(survey_id, voter_player_id, award_type)
);

-- Historical award records
CREATE TABLE player_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  player_id INTEGER NOT NULL,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES match_surveys(id) ON DELETE CASCADE,
  award_type TEXT NOT NULL CHECK (award_type IN ('mom', 'dod', 'mia')),
  vote_count INTEGER NOT NULL,
  is_co_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, match_id, award_type, player_id)
);
```

---

## Score Edit Preservation (v1.4.0)

When admin edits a match score ("Undo Completion" → re-complete):
- Survey and awards are **preserved** (not deleted)
- `match_id` FK is SET NULL when match is deleted
- `upcoming_match_id` is the stable identifier
- Complete route reconnects orphaned surveys/awards to new match_id

---

**End of Specification**

