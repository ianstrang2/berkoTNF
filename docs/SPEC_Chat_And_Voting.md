# Chat & Voting Specification

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Status:** Ready for Implementation  
**Dependencies:** None (self-contained feature)

---

## Overview

Add global team chat and post-match voting to increase player engagement. Chat replaces WhatsApp for team banter. Voting adds fun post-match awards (Man of the Match, Donkey of the Day, Missing in Action).

**Key principle:** Low friction, high engagement. Features must be obvious and easy to use or players will revert to WhatsApp.

---

## Table of Contents

1. [Navigation Restructure](#1-navigation-restructure)
2. [Chat Feature](#2-chat-feature)
3. [Voting Feature](#3-voting-feature)
4. [Badge Notifications](#4-badge-notifications)
5. [System Messages](#5-system-messages)
6. [Database Schema](#6-database-schema)
7. [API Routes](#7-api-routes)
8. [Admin Configuration](#8-admin-configuration)
9. [UI Components](#9-ui-components)
10. [Implementation Order](#10-implementation-order)
11. [Acceptance Criteria](#11-acceptance-criteria)

---

## 1. Navigation Restructure

### Current Navigation (4 tabs)
```
Dashboard | Upcoming | Table | Records
```

### New Navigation (4 tabs)
```
Home | Upcoming | Stats | Chat
```

### Changes Required

| Change | Details |
|--------|---------|
| Rename Dashboard → Home | Update labels, keep route `/player/dashboard` |
| Merge Table + Records → Stats | New unified section |
| Add Chat tab | New `/player/chat` route |

### Stats Tab Structure

**Secondary navigation:** `Half Season` | `Whole Season` | `All Time`

**Tertiary navigation (under All Time only):** `Leaderboard` | `Legends` | `Feats`

```
Stats
├── Half Season     → /player/stats/half (was /player/table/half)
├── Whole Season    → /player/stats/whole (was /player/table/whole)
└── All Time
    ├── Leaderboard → /player/stats/all-time/leaderboard (was /player/records/leaderboard)
    ├── Legends     → /player/stats/all-time/legends (was /player/records/legends)
    └── Feats       → /player/stats/all-time/feats (was /player/records/feats)
```

### Route Migration

| Old Route | New Route | Notes |
|-----------|-----------|-------|
| `/player/dashboard` | `/player/dashboard` | Keep, just rename label to "Home" |
| `/player/table/half` | `/player/stats/half` | Redirect old route |
| `/player/table/whole` | `/player/stats/whole` | Redirect old route |
| `/player/records/leaderboard` | `/player/stats/all-time/leaderboard` | Redirect old route |
| `/player/records/legends` | `/player/stats/all-time/legends` | Redirect old route |
| `/player/records/feats` | `/player/stats/all-time/feats` | Redirect old route |
| — | `/player/chat` | New route |

### React Query Considerations

The existing pages (`CurrentHalfSeason`, `OverallSeasonPerformance`, `LeaderboardStats`, `Legends`, `Feats`) already have optimized React Query hooks. When moving:
- Keep the same query keys (they're tenant-scoped)
- Don't change the data fetching logic
- Just update the route paths and navigation structure

---

## 2. Chat Feature

### Overview

Single global chat stream for the entire club. Replaces WhatsApp group.

### Core Features

| Feature | Details |
|---------|---------|
| Message posting | Text + Unicode emojis, 500 char limit |
| @mentions | Autocomplete from player list, highlights in message |
| Reactions | Fixed emoji set on messages |
| History | Last 1,000 messages retained (via scheduled cleanup job) |
| Moderation | Admin can delete messages |
| Real-time | Supabase Realtime for live updates |

### Who Can Chat

| Role | Can Post | Can React | Can @Mention | Can Delete |
|------|----------|-----------|--------------|------------|
| Active Player | ✅ | ✅ | ✅ | ❌ |
| Retired Player | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |

### @Mention Behavior

1. User types `@` → autocomplete dropdown appears
2. Dropdown shows ALL players (active first, then retired in separate "Retired" section)
3. User selects player → `@PlayerName` inserted
4. Mentioned player sees badge on Chat tab (if they have unread messages)
5. Mention renders with visual highlight (bold or colored)
6. If user manually types `@NonExistent`, treat as plain text

**Why include retired players?** Club banter often references past players ("Remember when @OldLegend did that?"). They're part of club history.

### Reactions

**Fixed emoji set:** 👍 😂 🔥 ❤️ 😮 👎

**Interaction:**
1. Long-press (mobile) or tap message (mobile alternative) or hover+click (desktop)
2. Emoji picker appears with fixed set
3. Tap emoji to add reaction
4. Tap same emoji again to remove
5. Reactions display as small row under message with counts

**Deleted messages:**
- Reaction picker disabled on deleted messages
- Existing reactions are hidden (not displayed under "[This message was deleted]")
- Reactions are cascade-deleted from DB when message is soft-deleted

### Message Deletion

| Who | Can Delete | Time Limit |
|-----|------------|------------|
| Player (own message) | ✅ | Within 5 minutes |
| Admin (any message) | ✅ | No limit |

- **No editing** - Prevents trust issues, keeps chat authentic
- Both player self-delete and admin delete show: "[This message was deleted]"
- Keeps conversation flow intact (replies still make sense)
- **Audit trail:** `deleted_by_player_id` tracks who deleted (admin's player_id or self)

**Why 5-minute window?** People make typos or post something they immediately regret. Longer than 5 mins = it's been read, too late to take back.

### Chat UI Layout

```
┌─────────────────────────────────────┐
│ Team Chat                    [badge]│
├─────────────────────────────────────┤
│                                     │
│  [System] Match report is live!     │
│                                     │
│  [Avatar] Dave                12:34 │
│  Great game yesterday! 🔥           │
│  👍3 😂1                            │
│                                     │
│  [Avatar] Steve               12:36 │
│  @Dave you were lucky with that     │
│  second goal mate                   │
│                                     │
│  [System] Voting is open!           │
│                                     │
│         ↑ Scroll for history ↑      │
│                                     │
├─────────────────────────────────────┤
│ Type a message...         [@] [Send]│
└─────────────────────────────────────┘
```

### Empty State

When no messages exist:
```
┌─────────────────────────────────────┐
│                                     │
│         💬                          │
│                                     │
│   No chat yet?                      │
│   Be the first to say something!    │
│                                     │
│         [Start chatting]            │
│                                     │
└─────────────────────────────────────┘
```

### Chat Loading Pattern

1. Open chat → load most recent 50 messages
2. Messages display with newest at bottom
3. Scroll UP to load older messages (paginated, 50 at a time)
4. New messages appear at bottom in real-time
5. If user is scrolled up when new messages arrive:
   - Show "↓ New messages" banner at bottom of viewport
   - Tapping banner scrolls to newest message
   - Standard chat UX pattern (WhatsApp, Slack, Discord)

---

## 3. Voting Feature

### Overview

Post-match voting for fun awards. Time-limited, anonymous results until closed.

### Award Categories

| Award | Icon | Description | Default |
|-------|------|-------------|---------|
| Man of the Match (MoM) | 💪 (current strongman) | Best player | ON |
| Donkey of the Day (DoD) | 🫏 (donkey SVG) | Worst performance | ON |
| Missing in Action (MiA) | 🦝 (possum SVG) | Invisible player | OFF |

**Note:** "On Fire" icon changes from strongman → 🔥 flame (SVG to be provided)

### Voting Rules

| Rule | Setting |
|------|---------|
| Voting window | 12 hours default (admin configurable) |
| Who can vote | Only players who played in that match |
| Who can be voted for | Only players who played in that match |
| Self-voting | Allowed |
| Skipping categories | Allowed |
| Change votes | Allowed until voting closes |
| Ties | Co-winners (both get award) |
| Multiple awards | Same player can win multiple (e.g., MoM + DoD) |

### Voting Lifecycle

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
           ▼ (timer expires)
   ┌───────────────┐
   │ Survey Closed │ ← is_open=false
   │ Results Tally │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │ Awards Display│ ← Icons appear by winner names
   │ in MatchReport│
   └───────────────┘
```

### Survey Creation Rules

**Trigger conditions (ALL must be true):**
1. Match is the chronologically LATEST match
2. Result is being submitted (not edited)
3. No survey already exists for this match
4. Survey feature is enabled in admin config

**Survey immutability:**
- Player list is **snapshotted** at creation time
- Edits to match AFTER survey creation do NOT affect voting eligibility
- Admin sees warning if editing match with active survey

**API validation (IMPORTANT):** On vote submission, always validate against the snapshotted `eligible_player_ids` array in `match_surveys`, NOT the current `player_matches` table. Error message: "You weren't marked as playing in that match when voting opened, so you can't vote."

**Historical match protection:**
- Editing old matches (not the latest) NEVER creates a survey
- Prevents accidental surveys for 2021 matches

### Award Display Duration

Awards (MoM, DoD, MiA icons) appear next to player names in:
- Match Report (team lists)
- Upcoming Match Card (player pool)
- Player profile pages
- Leaderboard
- Copy/paste team lists

**Duration:** Show awards from the latest match that has a **completed survey** (i.e., `match_surveys.is_open = false` with most recent `match_date`).

**Why this rule?** Prevents edge case where admin publishes teams for next match before entering previous result — awards shouldn't disappear prematurely.

**Query pattern:**
```sql
-- Get ALL awards from the most recent completed survey
SELECT pa.player_id, pa.award_type, pa.vote_count, pa.is_co_winner
FROM player_awards pa
WHERE pa.tenant_id = ?
  AND pa.survey_id = (
    SELECT ms.id 
    FROM match_surveys ms
    JOIN matches m ON ms.match_id = m.match_id
    WHERE ms.tenant_id = ?
      AND ms.is_open = false
    ORDER BY m.match_date DESC
    LIMIT 1
  );
```

### Award History Tracking

Store all historical awards for future features (e.g., "Most MoM wins this season", award-based points).

**Track:** MoM, DoD, MiA  
**Do NOT track:** On Fire, Grim Reaper (these are streak-based, already tracked elsewhere)

### Voting UI - Modal

Accessed via "Vote Now" banner on Dashboard/Home.

```
┌─────────────────────────────────────┐
│ Post-Match Voting          [Close X]│
├─────────────────────────────────────┤
│                                     │
│ 🏆 Man of the Match                 │
│ ┌─────────────────────────────────┐ │
│ │ [✓] No-one / Skip               │ │  ← First option
│ │ [ ] Dave          [Club Badge]  │ │
│ │ [ ] Steve         [Club Badge]  │ │
│ │ [ ] Mike          [Club Badge]  │ │
│ │ [ ] Tom           [Club Badge]  │ │
│ │ ... (scrollable)                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🫏 Donkey of the Day                │
│ ┌─────────────────────────────────┐ │
│ │ [✓] No-one / Skip               │ │
│ │ [ ] Dave          [Club Badge]  │ │
│ │ [ ] Steve         [Club Badge]  │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ (MiA section if enabled)            │
│                                     │
├─────────────────────────────────────┤
│ 14 players have voted               │
│                                     │
│        [Submit Votes]               │
│                                     │
│   ⏱️ Voting closes in 6h 23m        │
└─────────────────────────────────────┘
```

**UI Notes:**
- Match styling from Match Control Centre player lists
- Show player's selected club badge
- Single selection per category (radio behavior)
- **"No-one / Skip" is the first option in each category** (allows clearing a previous vote)
- Pre-fill existing votes when reopening modal (default to "No-one / Skip" if no vote)
- Submit always enabled - selecting "No-one / Skip" for all categories is valid (clears any existing votes)

**API handling:**
- `mom: null` or `mom: 'skip'` = **DELETE** the existing `match_votes` row for that category (not update to null)
- `mom: 123` = **UPSERT** vote for player 123 (insert or update existing row)
- Missing key (e.g., `mom` not in request) = no change to that category

### Voting Banner on Dashboard

When voting is active AND current user is eligible to vote:

```
┌─────────────────────────────────────┐
│ 🗳️ Voting Open — 6h 23m left        │
│                                     │
│         [Vote Now]                  │  ← Before voting
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🗳️ Voting Open — 6h 23m left        │
│                                     │
│       [Change Vote]                 │  ← After voting
└─────────────────────────────────────┘
```

**Visibility rules:**
- Only show if active survey exists (`is_open = true`)
- Only show if current user is in `eligible_player_ids` (they played in the match)
- Hide for users who didn't play (they can't vote anyway)
- **Stays visible until voting closes** (allows vote changes)
- Button text changes: "Vote Now" → "Change Vote" after user has voted

Positioned: Below match score, above match details.

### Awards Section in Match Report

After voting closes, display results:

```
┌─────────────────────────────────────┐
│ 🏆 Match Awards                     │
├─────────────────────────────────────┤
│                                     │
│  💪 Man of the Match                │
│     Steve (7 votes)                 │
│                                     │
│  🫏 Donkey of the Day               │
│     Dave (5 votes)                  │
│     Mike (5 votes) ← Co-winner      │
│                                     │
└─────────────────────────────────────┘
```

**Location:** Inside MatchReport component, beneath Milestones, above "Open Chat" button.

**Visibility:** Only shows after voting closes. Hidden during active voting.

**Data source:** Query `player_awards` table separately (not embedded in `aggregated_match_report`). This avoids needing a second background job when voting closes. Query is trivial (<1ms for ~6 rows with index).

**No-winner handling:**
- If a category has zero votes (everyone skipped), **omit that category entirely** from the display
- If ALL categories have zero votes, hide the entire Awards section (don't show empty block)
- This keeps the UI clean — no awkward "No winner" placeholders

---

## 4. Badge Notifications

In-app badges only. No push notifications for chat/voting.

### Badge Logic

| Tab | Badge When | Clears When |
|-----|------------|-------------|
| Chat | Unread messages exist | User opens Chat tab |
| Home | Match report published while user in other tab | User opens Home tab |
| Upcoming | (Future: RSVP needed) | — |

### Home Badge Edge Case

When user is in Chat, Stats, or Upcoming AND a match report is published:
- Small dot appears on Home tab icon
- Signals "Hey, the stats just dropped"
- Clears when user navigates to Home

### Implementation

Store `last_read_chat_timestamp` per user. Compare with latest message timestamp to determine unread count.

Store `last_viewed_match_report_id` per user. Compare with latest match to determine if new report exists.

---

## 5. System Messages

Automated messages posted to chat for key events.

### System Message Triggers

| Event | Message Template | Trigger |
|-------|------------------|---------|
| Match report (voting enabled) | "📊 Match report is live! {score} to {winningTeam} · 🗳️ Voting open (closes in {duration}h)" | After stats update completes + survey created |
| Match report (voting disabled) | "📊 Match report is live! {score} to {winningTeam}" | After stats update completes (no survey) |
| Voting closed (has awards) | "🏆 Voting closed — check the match report for awards!" | When survey closes with at least one winner |
| Voting closed (no awards) | "🗳️ Voting closed — no awards this week" | When survey closes but all categories were skipped |
| Teams published | "⚽ Teams published for {dayOfWeek}'s match!" | When admin saves teams |
| New player joined | "👋 Welcome {playerName} to the club!" | When join request approved |

**Dynamic values:**
- `{score}` = e.g., "3-0" (from match result)
- `{winningTeam}` = Team A/B name from config (e.g., "Orange", "Green")
- `{duration}` = from `voting_duration_hours` config
- `{dayOfWeek}` = Calculated from match date
- `{playerName}` = From approved join request

**Notes:**
- Match report and voting open are bundled into one message to reduce notification noise
- Voting part only included if a survey was actually created (voting may be disabled in config)
- Voting closed has two variants: "check the match report" (has winners) vs "no awards this week" (all skipped)

### System Message Styling

```css
/* System messages are visually distinct */
.system-message {
  color: #6b7280;           /* Grey text */
  font-size: 0.875rem;      /* Smaller */
  text-align: center;       /* Centered */
  background: #f3f4f6;      /* Light grey background */
  padding: 8px 16px;
  border-radius: 8px;
  margin: 8px auto;
  max-width: 80%;
}
/* No avatar for system messages */
```

---

## 6. Database Schema

### New Tables

```sql
-- ============================================
-- CHAT TABLES
-- ============================================

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  -- Author (NULL for system messages)
  author_player_id INTEGER REFERENCES players(player_id),
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Mentions (array of player IDs mentioned in this message, max 10)
  mentions INTEGER[] DEFAULT '{}',
  
  CONSTRAINT mentions_limit CHECK (array_length(mentions, 1) IS NULL OR array_length(mentions, 1) <= 10),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,  -- Soft delete (player self-delete or admin moderation)
  deleted_by_player_id INTEGER REFERENCES players(player_id),  -- Who deleted (NULL = admin)
  
  CONSTRAINT content_length CHECK (char_length(content) <= 500)
);

-- Indexes for chat_messages
CREATE INDEX idx_chat_messages_tenant_created 
  ON chat_messages(tenant_id, created_at DESC);
CREATE INDEX idx_chat_messages_mentions 
  ON chat_messages USING GIN(mentions);

-- Chat reactions
-- Note: When a message is soft-deleted, delete its reactions in the same transaction
CREATE TABLE chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  message_id UUID NOT NULL REFERENCES chat_messages(id),
  player_id INTEGER NOT NULL REFERENCES players(player_id),
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '😂', '🔥', '❤️', '😮', '👎')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(message_id, player_id, emoji)
);

-- Index for reactions
CREATE INDEX idx_chat_reactions_message 
  ON chat_reactions(message_id);

-- User chat state (for badge tracking)
CREATE TABLE chat_user_state (
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  player_id INTEGER NOT NULL REFERENCES players(player_id),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (tenant_id, player_id)
);

-- ============================================
-- VOTING TABLES
-- ============================================

-- Post-match surveys
CREATE TABLE match_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  match_id INTEGER NOT NULL REFERENCES matches(match_id),
  
  -- Snapshotted data (immutable after creation)
  eligible_player_ids INTEGER[] NOT NULL,  -- Players who played
  enabled_categories TEXT[] NOT NULL,      -- ['mom', 'dod', 'mia']
  
  -- State
  is_open BOOLEAN NOT NULL DEFAULT true,
  voting_closes_at TIMESTAMPTZ NOT NULL,
  
  -- Results (populated when survey closes)
  results JSONB,  -- { "mom": [player_id, ...], "dod": [...], "mia": [...] }
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, match_id)
);

-- Indexes for surveys
CREATE INDEX idx_match_surveys_tenant_open 
  ON match_surveys(tenant_id, is_open) WHERE is_open = true;
CREATE INDEX idx_match_surveys_match 
  ON match_surveys(match_id);

-- Individual votes
CREATE TABLE match_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  survey_id UUID NOT NULL REFERENCES match_surveys(id) ON DELETE CASCADE,
  
  -- Voter
  voter_player_id INTEGER NOT NULL REFERENCES players(player_id),
  
  -- Vote
  award_type TEXT NOT NULL CHECK (award_type IN ('mom', 'dod', 'mia')),
  voted_for_player_id INTEGER NOT NULL REFERENCES players(player_id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One vote per voter per category (upsert pattern)
  UNIQUE(survey_id, voter_player_id, award_type)
);

-- Index for votes
CREATE INDEX idx_match_votes_survey 
  ON match_votes(survey_id);

-- Historical award records
CREATE TABLE player_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  player_id INTEGER NOT NULL REFERENCES players(player_id),
  match_id INTEGER NOT NULL REFERENCES matches(match_id),
  survey_id UUID NOT NULL REFERENCES match_surveys(id),
  
  award_type TEXT NOT NULL CHECK (award_type IN ('mom', 'dod', 'mia')),
  vote_count INTEGER NOT NULL,
  is_co_winner BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, match_id, award_type, player_id)
);

-- Indexes for award history
CREATE INDEX idx_player_awards_player 
  ON player_awards(tenant_id, player_id, award_type);
CREATE INDEX idx_player_awards_match 
  ON player_awards(tenant_id, match_id);

-- ============================================
-- USER STATE TABLE (for Home badge)
-- ============================================

CREATE TABLE user_app_state (
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  player_id INTEGER NOT NULL REFERENCES players(player_id),
  
  last_viewed_match_id INTEGER REFERENCES matches(match_id),
  last_viewed_at TIMESTAMPTZ,
  
  PRIMARY KEY (tenant_id, player_id)
);
```

### Schema Notes

1. **Multi-tenancy:** All tables have `tenant_id` and will use `withTenantFilter()`
2. **Soft deletes:** Chat messages use `deleted_at` for admin moderation
3. **Vote upsert:** `UNIQUE(survey_id, voter_player_id, award_type)` enables vote changing via upsert
4. **Snapshotted players:** `eligible_player_ids` frozen at survey creation
5. **Award history:** `player_awards` tracks all historical awards for future features
6. **Atomic updates:** When survey closes, update `match_surveys.results` AND insert `player_awards` rows in the same transaction to prevent sync issues

### Chat Cleanup Job

To enforce the 1,000 message limit, create a scheduled Supabase function or cron job:

```sql
-- Run daily via pg_cron or Supabase scheduled function
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
  -- Step 1: Delete reactions for messages that will be deleted (FK constraint)
  DELETE FROM chat_reactions
  WHERE message_id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as rn
      FROM chat_messages
    ) ranked
    WHERE rn > 1000
  );
  
  -- Step 2: Delete old messages (now safe - no FK violations)
  DELETE FROM chat_messages
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as rn
      FROM chat_messages
    ) ranked
    WHERE rn > 1000
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule to run daily at 3am UTC
SELECT cron.schedule('cleanup-chat-messages', '0 3 * * *', 'SELECT cleanup_old_chat_messages()');
```

**Alternative:** Use Supabase Edge Function with cron trigger if pg_cron is not available.

**Important:** Reactions must be deleted BEFORE messages to avoid FK constraint violations.

---

## 7. API Routes

### Chat Routes

```
POST   /api/chat/messages           - Send message
GET    /api/chat/messages           - Get messages (paginated)
DELETE /api/chat/messages/[id]      - Delete message (admin anytime, or self within 5 min)
POST   /api/chat/messages/[id]/react - Add/remove reaction
GET    /api/chat/unread-count       - Get unread count for badge
POST   /api/chat/mark-read          - Mark messages as read
```

### Voting Routes

```
GET    /api/voting/active           - Get active survey for current user
POST   /api/voting/submit           - Submit/update votes
GET    /api/voting/results/[matchId] - Get voting results (after closed)
```

### Internal Routes (called by background jobs)

```
POST   /api/internal/voting/create-survey   - Create survey after match result
POST   /api/internal/voting/close-survey    - Close survey and tally results
POST   /api/internal/chat/system-message    - Post system message
```

### Route Details

#### POST /api/chat/messages

```typescript
// Request
{
  content: string;      // Max 500 chars
  mentions?: number[];  // Player IDs mentioned
}

// Response
{
  success: true;
  message: {
    id: string;
    content: string;
    author: { id: number; name: string; selectedClub: object };
    mentions: number[];
    createdAt: string;
    reactions: [];
  }
}
```

#### GET /api/chat/messages

```typescript
// Query params
?before=<message_id>  // For pagination (load older)
&limit=50             // Default 50, max 100

// Response
{
  success: true;
  messages: Message[];  // Sorted by created_at DESC (newest first in response)
  hasMore: boolean;
}

// Note: Client reverses array to display oldest-to-newest (standard chat UX)
```

#### POST /api/voting/submit

```typescript
// Request
{
  surveyId: string;
  votes: {
    mom?: number;  // Player ID
    dod?: number;
    mia?: number;
  }
}

// Response
{
  success: true;
  message: "Votes submitted"
}

// Errors
- 400: Survey is closed
- 400: You are not eligible to vote
- 400: Invalid player selection
```

---

## 8. Admin Configuration

### New Admin Setup Section

**Route:** `/admin/setup?level=standard&section=voting`

**Location:** New section in existing admin setup page, styled identically to other sections.

### Configuration Options

| Setting | Key | Type | Default | Description |
|---------|-----|------|---------|-------------|
| Enable Survey | `voting_enabled` | boolean | true | Master toggle |
| Man of the Match | `voting_mom_enabled` | boolean | true | Enable MoM voting |
| Donkey of the Day | `voting_dod_enabled` | boolean | true | Enable DoD voting |
| Missing in Action | `voting_mia_enabled` | boolean | false | Enable MiA voting |
| Voting Duration | `voting_duration_hours` | number | 12 | Hours voting stays open |

### Storage

Add to `app_config` table with `config_group = 'voting'`:

```sql
INSERT INTO app_config (tenant_id, config_key, config_value, config_group, display_name, display_group, sort_order, complexity_level)
VALUES
  (?, 'voting_enabled', 'true', 'voting', 'Enable Post-Match Voting', 'Voting', 1, 'standard'),
  (?, 'voting_mom_enabled', 'true', 'voting', 'Man of the Match', 'Voting', 2, 'standard'),
  (?, 'voting_dod_enabled', 'true', 'voting', 'Donkey of the Day', 'Voting', 3, 'standard'),
  (?, 'voting_mia_enabled', 'false', 'voting', 'Missing in Action', 'Voting', 4, 'standard'),
  (?, 'voting_duration_hours', '12', 'voting', 'Voting Duration (hours)', 'Voting', 5, 'standard');
```

### Reset to Default

"Reset to Default" button restores:
- voting_enabled = true
- voting_mom_enabled = true
- voting_dod_enabled = true
- voting_mia_enabled = false
- voting_duration_hours = 12

---

## 9. UI Components

### New Components to Create

```
src/components/
├── chat/
│   ├── ChatContainer.component.tsx      # Main chat wrapper
│   ├── ChatMessage.component.tsx        # Individual message
│   ├── ChatInput.component.tsx          # Message input with @mention
│   ├── ChatReactions.component.tsx      # Reaction display/picker
│   ├── ChatSystemMessage.component.tsx  # System message styling
│   ├── MentionAutocomplete.component.tsx # @mention dropdown
│   └── index.ts
├── voting/
│   ├── VotingBanner.component.tsx       # Dashboard banner
│   ├── VotingModal.component.tsx        # Voting modal
│   ├── VotingResults.component.tsx      # Results display
│   ├── AwardIcon.component.tsx          # MoM/DoD/MiA icons
│   └── index.ts
└── icons/
    ├── FlameIcon.component.tsx          # New On Fire icon
    ├── DonkeyIcon.component.tsx         # DoD icon
    └── PossumIcon.component.tsx         # MiA icon
```

### Modified Components

```
src/components/
├── dashboard/
│   └── MatchReport.component.tsx        # Add VotingBanner, Awards section, Chat CTA
├── navigation/
│   ├── BottomNavigation.component.tsx   # Update labels, add Chat, add badges
│   └── NavigationTabs.component.tsx     # Update for Stats tab structure
├── icons/
│   └── FireIcon.component.tsx           # Replace strongman with flame
└── (various player list components)     # Add award icons by player names
```

### New Pages

```
src/app/player/
├── chat/
│   └── page.tsx                         # Chat page
└── stats/
    ├── page.tsx                         # Stats landing (redirect to half)
    ├── half/
    │   └── page.tsx                     # Half season (moved from table/half)
    ├── whole/
    │   └── page.tsx                     # Whole season (moved from table/whole)
    └── all-time/
        ├── leaderboard/
        │   └── page.tsx                 # Moved from records/leaderboard
        ├── legends/
        │   └── page.tsx                 # Moved from records/legends
        └── feats/
            └── page.tsx                 # Moved from records/feats
```

---

## 10. Implementation Order

### Phase 1: Foundation (Week 1)

1. **Database migration** - Create all new tables
2. **Navigation restructure** - Merge Tables+Records → Stats, rename Dashboard → Home
3. **Route migration** - Set up new routes with redirects from old
4. **Update NavigationContext** - Add Chat section, update NAVIGATION_CONFIG

### Phase 2: Chat Core (Week 1-2)

5. **Chat API routes** - CRUD for messages
6. **Supabase Realtime setup** - Configure for chat_messages table
7. **ChatContainer + ChatMessage** - Basic chat display
8. **ChatInput** - Message posting
9. **Chat page** - `/player/chat` with ChatContainer

### Phase 3: Chat Polish (Week 2)

10. **@Mention system** - Autocomplete + highlighting
11. **Reactions** - Add/remove reactions UI
12. **Admin moderation** - Delete message functionality
13. **Badge system** - Unread count on Chat tab
14. **System messages** - Styling + posting infrastructure

### Phase 4: Voting Core (Week 2-3)

15. **Voting admin config** - New setup section
16. **Survey creation** - Trigger on match result (background job integration)
17. **VotingBanner** - Show on Dashboard when voting active
18. **VotingModal** - Vote submission UI
19. **Vote API** - Submit/update votes

### Phase 5: Voting Results (Week 3)

20. **Survey closing** - Scheduled job to close and tally
21. **VotingResults** - Display in MatchReport
22. **Award icons** - Create MoM/DoD/MiA icons
23. **Award display** - Show icons by player names everywhere
24. **Award history** - Track in player_awards table

### Phase 6: Integration (Week 3)

25. **System messages** - Auto-post for match report, voting open/close, teams, new players
26. **Home badge** - Badge when match report published while in other tab
27. **"Open Chat" CTA** - Add to bottom of MatchReport
28. **Testing & polish**

---

## 11. Acceptance Criteria

### Chat

- [ ] Players can send messages up to 500 characters
- [ ] Messages appear in real-time for all users
- [ ] @mentions autocomplete with all players (active first, then retired)
- [ ] @mentions visually highlighted in messages
- [ ] Mentioned player sees badge on Chat tab
- [ ] Fixed set of reaction emojis (👍 😂 🔥 ❤️ 😮 👎)
- [ ] Reactions display with counts under messages
- [ ] Reactions update in real-time (Supabase Realtime subscription)
- [ ] Reactions disappear when message is deleted
- [ ] Players can delete own messages within 5 minutes
- [ ] Admin can delete any message (no time limit)
- [ ] Chat history limited to 1,000 messages (cleanup job runs daily)
- [ ] Scrolling up loads older messages
- [ ] "New messages" banner appears when scrolled up and new messages arrive
- [ ] System messages styled differently (grey, centered)
- [ ] Empty state shows "No chat yet? Be the first to say something!"

### Voting

- [ ] Survey created automatically when latest match result entered
- [ ] Survey NOT created for historical match edits
- [ ] Only players who played can vote
- [ ] Only players who played appear as candidates
- [ ] "No-one / Skip" option appears first in each category
- [ ] Players can skip categories or clear previous votes
- [ ] Players can change votes before closing
- [ ] Voting closes after configured duration (default 12h)
- [ ] Results show after voting closes
- [ ] Ties result in co-winners
- [ ] Award icons appear by winner names until next match report
- [ ] Vote counts displayed with results
- [ ] Voting banner stays visible until close (shows "Change Vote" after voting)
- [ ] "No awards this week" message if all categories skipped
- [ ] Awards section omits categories with zero votes (no empty blocks)

### Admin Config

- [ ] Voting section in /admin/setup
- [ ] Toggle for each category (MoM, DoD, MiA)
- [ ] Configurable voting duration
- [ ] Reset to default works correctly

### Navigation

- [ ] Dashboard renamed to Home
- [ ] Tables + Records merged into Stats
- [ ] Stats has Half Season / Whole Season / All Time secondary nav
- [ ] All Time has Leaderboard / Legends / Feats tertiary nav
- [ ] Chat tab appears in navigation
- [ ] Old routes redirect to new routes
- [ ] React Query caching still works correctly after migration

### Badges

- [ ] Chat tab shows badge when unread messages exist
- [ ] Badge clears when user opens Chat
- [ ] Home tab shows badge when match report published while user in other tab
- [ ] Badge clears when user opens Home

### System Messages

- [ ] "Match report is live! Voting open" bundled message when match report published
- [ ] "Voting closed" message posted when survey closes (conditional: awards vs no awards variant)
- [ ] "Teams published!" posted when admin saves teams
- [ ] "Welcome [Name]!" posted when new player approved

---

## Appendix: Icon Assets Required

| Icon | Current | New | Notes |
|------|---------|-----|-------|
| On Fire | 💪 Strongman | 🔥 Flame | SVG needed |
| Man of the Match | — | 💪 Strongman | Repurpose current On Fire |
| Donkey of the Day | — | 🫏 Donkey | SVG needed |
| Missing in Action | — | 🦝 Possum | SVG needed |
| Grim Reaper | 💀 Skull | 💀 Skull | No change |

**Action required:** Provide SVG files for Flame, Donkey, Possum icons.

### Icon Migration Checklist

When implementing, update "On Fire" → Flame icon in ALL locations:
- [ ] `FireIcon.component.tsx` - Replace strongman SVG with flame
- [ ] `MatchReport.component.tsx` - On Fire player display
- [ ] `UpcomingMatchCard.component.tsx` - Player pool fire indicator
- [ ] `LeaderboardStats.component.tsx` - If On Fire shown here
- [ ] `PlayerProfile.component.tsx` - If On Fire shown on profile
- [ ] Any copy/paste team list generation

The existing "On Fire" logic (streak detection) stays the same — only the icon changes.

---

## Appendix: Supabase Realtime Setup

### Enable Realtime on chat tables

```sql
-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
```

### Client Subscription

```typescript
// In ChatContainer.component.tsx
useEffect(() => {
  const channel = supabase
    .channel('chat')
    // Messages: INSERT and UPDATE (for soft deletes)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        addMessage(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        // Handle soft deletes (deleted_at set)
        updateMessage(payload.new);
      }
    )
    // Reactions: INSERT and DELETE
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_reactions',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        addReaction(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_reactions',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        removeReaction(payload.old);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tenantId]);
```

**Note:** We use UPDATE events for messages (soft delete via `deleted_at`) and DELETE events for reactions (hard delete).

---

**End of Specification**
