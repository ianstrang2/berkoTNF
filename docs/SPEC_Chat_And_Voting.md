# Chat & Voting Specification

**Version:** 1.1.0  
**Last Updated:** December 8, 2025  
**Status:** Ready for Implementation  
**Dependencies:** Existing background job worker (Render), Supabase Realtime (to be enabled)

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

**Secondary navigation:** `Half Season` | `Season` | `All Time` | `Legends`

**Tertiary navigation:**
- Under `Half Season`, `Season`: Points/Goals/Race toggle (existing)
- Under `All Time`: `Leaderboard` | `Feats`
- Under `Legends`: `Season Winners` | `Top Scorers`

```
Stats
├── Half Season     → /player/stats/half (was /player/table/half)
├── Season          → /player/stats/season (was /player/stats/whole, /player/table/whole)
├── All Time
│   ├── Leaderboard → /player/stats/all-time/leaderboard (was /player/records/leaderboard)
│   └── Feats       → /player/stats/all-time/feats (was /player/records/feats)
└── Legends
    ├── Winners     → /player/stats/legends/winners (was /player/records/legends?view=winners)
    └── Scorers     → /player/stats/legends/scorers (was /player/records/legends?view=scorers)
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
4. Mention renders with visual highlight (bold or colored)
5. If user manually types `@NonExistent`, treat as plain text

**Note:** Mentioned players see the mention when they open chat (normal unread flow). No special mention-specific badge — just the standard unread count.

**Why include retired players?** Club banter often references past players ("Remember when @OldLegend did that?"). They're part of club history.

### Reactions

**Fixed emoji set:** 👍 😂 🔥 ❤️ 😮 👎

**Interaction:**
1. Long-press (mobile) or tap message (mobile alternative) or hover+click (desktop)
2. Emoji picker appears with fixed set
3. Tap emoji to add reaction
4. Tap same emoji again to remove
5. Reactions display as small row under message with counts

**Not allowed on:**
- System messages (no reaction picker shown)
- Deleted messages (picker disabled)

**Deleted messages:**
- Existing reactions are hidden (not displayed)
- Reactions are **hard-deleted** in the same transaction as the soft-delete (see Message Deletion section)

**Viewing who reacted (implemented Dec 2025):**
- Single tap on reaction chips → opens "Who Reacted" bottom sheet modal
- Shows each emoji with list of player names
- "You" shown in purple if current user reacted
- Modal positioned above bottom navigation

### Message Deletion

| Who | Can Delete | Time Limit |
|-----|------------|------------|
| Player (own message) | ✅ | Within 5 minutes |
| Admin (any message) | ✅ | No limit |

- **No editing** - Prevents trust issues, keeps chat authentic
- **Personalized text (implemented Dec 2025):**
  - Self-delete: "You deleted this message"
  - Others deleted: "This message was deleted"
- Keeps conversation flow intact (replies still make sense)
- **Audit trail:** `deleted_by_player_id` tracks who deleted (admin's player_id or self)

**Deleted Message UI (implemented Dec 2025):**
- Trash icon with purple→pink gradient
- Italicized grey text
- Bubble shrinks to fit content (no empty space)
- No timestamp, sender name, or avatar shown
- **Consecutive collapse:** 2+ deleted messages in a row → single "[X messages deleted]" entry

**Why 5-minute window?** People make typos or post something they immediately regret. Longer than 5 mins = it's been read, too late to take back.

**API implementation (CRITICAL):**
```typescript
// DELETE /api/chat/messages/[id]
// 1. Check ownership and time window
if (!isAdmin && message.author_player_id !== currentPlayerId) {
  return error(403, 'Cannot delete others messages');
}
if (!isAdmin && (now - message.created_at) > 5 * 60 * 1000) {
  return error(400, 'Can only delete messages within 5 minutes');
}

// 2. Soft-delete message AND hard-delete reactions in same transaction
await prisma.$transaction([
  prisma.chat_messages.update({
    where: { id: messageId },
    data: { deleted_at: new Date(), deleted_by_player_id: currentPlayerId }
  }),
  prisma.chat_reactions.deleteMany({
    where: { message_id: messageId }
  })
]);
```

**Note:** `ON DELETE CASCADE` only fires on hard deletes. For soft-deletes, we must manually delete reactions in the same transaction.

**Realtime event flow for message deletion:**
1. Backend soft-deletes message + hard-deletes reactions (same transaction)
2. Clients receive `DELETE` events on `chat_reactions` → remove reactions from UI
3. Clients receive `UPDATE` event on `chat_messages` (`deleted_at` set) → render "[This message was deleted]"

**No archive:** Deleted message content is NOT preserved anywhere. This is intentional — no audit trail of chat content. If moderation logging is needed in future, add a separate `moderation_log` table.

### Chat UI Layout

**Implementation:** WhatsApp-style chat with date separators.

```
┌─────────────────────────────────────┐
│                                     │
│           Beginning of chat         │
│                                     │
│            [ Yesterday ]            │  ← Date separator
│                                     │
│  [System] Match report is live!     │
│                                     │
│  [Badge] Ali Wilson          12:34  │  ← Club badge as avatar
│  Great game yesterday! 🔥           │
│  👍3 😂1                            │  ← Reactions chip (overlaps bubble)
│                                     │
│              [ Today ]              │  ← Date separator
│                                     │
│  [Badge] Steve               12:36  │
│  @Ali Wilson you were lucky         │  ← @mention highlighted
│  with that second goal mate         │
│                                     │
│  [System] Voting is open!           │
│                                     │
│                                     │
│       [ ↓ New messages ]            │  ← Banner when scrolled up
│                                     │
├─────────────────────────────────────┤
│ Type a message...         [@] [Send]│
└─────────────────────────────────────┘
```

**Key UI Patterns (Implemented):**

| Element | Styling | Notes |
|---------|---------|-------|
| Background | Doodle pattern on `#ECE5DD` | `/img/chat-bg.webp` tiled at 300×300px |
| Outgoing bubbles | `bg-[#A855F7]` (purple) + `shadow-sm` | Aligned right, max 80% width |
| Incoming bubbles | `bg-white` + `shadow-sm` | Aligned left, max 80% width |
| Bubble corners | `rounded-xl` (12px) | Uniform corners, no "tail" effect |
| Avatar | 24px club badge | Uses `selected_club.filename` from player data |
| Avatar position | Bottom-left of last message in group | `showAvatar={isLastInGroup}` |
| Sender name | 15px semibold purple | First message in group only |
| Message text | 15px, line-height 1.4 | Inline timestamp after text |
| Timestamp | 11px, 60% opacity | Inline with text, not absolutely positioned |
| Reactions | 24px tall chip, 3px overlap below bubble | Tap to see who reacted |
| Reactions modal | Bottom sheet, z-index 10000 | Above bottom nav, slide-up animation |
| Date separators | `bg-white text-gray-900` pill | Fully opaque, centered, shadow-sm |
| System messages | `bg-white/80 text-[#9da3aa]` pill | Centered, shadow-sm, no avatar |
| Deleted messages | `bg-gray-50` shrink-wrap bubble | Gradient trash icon, italic grey text |
| Collapsed deletes | Centered pill like system message | "X messages deleted" for consecutive |

**Date Separator Format:**
- Today: "Today"
- Yesterday: "Yesterday"
- Within 7 days: Day name (e.g., "Friday")
- Older: "Wed, 3 Dec" format

**Background Pattern:**
- Image: `/public/img/chat-bg.webp` (tileable doodle pattern)
- Fallback: `#ECE5DD` (beige) if image fails to load
- Tile size: `300px × 300px` (adjustable for density)

**Interaction Patterns (WhatsApp-style):**
| Action | Target | Result |
|--------|--------|--------|
| Tap | Message bubble | Opens reaction picker (emoji bar) |
| Long-press | Message bubble | Opens reaction picker (same as tap) |
| Tap | Reaction chip | Opens "Who Reacted" modal |
| Tap emoji in picker | Reaction picker | Adds/removes your reaction |
| Tap delete icon | Reaction picker | Deletes message (if allowed) |

### Empty State

When no messages exist (implemented in `ChatContainer.component.tsx`):

```
┌─────────────────────────────────────┐
│                                     │
│         [Chat icon - grey]          │
│                                     │
│       No chat yet?                  │
│  Be the first to say something!     │
│                                     │
├─────────────────────────────────────┤
│ Type a message...         [@] [Send]│
└─────────────────────────────────────┘
```

**Note:** Uses SVG chat icon (not emoji). Input area is always visible.

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
1. **First-time result submission** — `result_submitted_at` transitions from `NULL` → timestamp
2. Match is the chronologically **LATEST match**
3. No survey already exists for this match
4. Survey feature is enabled in admin config (`voting_enabled = true`)

**🚨 CRITICAL: Survey creation MUST NEVER occur on:**
- Match edits (score corrections, player adjustments)
- Match re-saves
- Historical match edits (any non-latest match)
- Re-running the stats worker manually
- Match deletion + recreation (new match_id = no survey link)

**Only the first-time result submission of the latest match qualifies.**

**Survey immutability:**
- Player list is **snapshotted** at creation time (`eligible_player_ids`)
- Edits to match AFTER survey creation do NOT affect voting eligibility
- Admin sees warning if editing match with active survey

**API validation (IMPORTANT):** On vote submission, always validate against the snapshotted `eligible_player_ids` array in `match_surveys`, NOT the current `player_matches` table. Error message: "You weren't marked as playing in that match when voting opened, so you can't vote."

**Note:** Eligibility is enforced at the **API layer only**. The database allows any valid `player_id` in `match_votes` (no FK to `eligible_player_ids`). This is intentional for flexibility — the API is the source of truth for eligibility checks.

**Match Deletion Cascade:**
- When a match is deleted, **cascade delete** its survey, votes, and awards
- No orphaned records — foreign keys handle cleanup automatically
- See Appendix: Survey Creation Rules for full cascade details

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
    ORDER BY m.match_date DESC, m.match_id DESC  -- match_id as tie-breaker
    LIMIT 1
  );
```

**"Latest match" definition:** `match_date` is date-only (no time component). For multiple matches on the same day (rare), the one with highest `match_id` is considered "latest".

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
- **MUST follow mobile-safe modal pattern** from `SPEC_Modals.md` (Pattern 2: Custom Form Modal)
- Use `items-start` + `justify-center` (NOT `items-center`)
- Use `maxHeight: calc(100vh - 4rem)` outer, `calc(100vh - 8rem)` inner scroll
- Match styling from Match Control Centre player lists
- Show player's selected club badge
- Single selection per category (radio behavior)
- **"No-one / Skip" is the first option in each category** (allows clearing a previous vote)
- Pre-fill existing votes when reopening modal (default to "No-one / Skip" if no vote)
- Submit always enabled - selecting "No-one / Skip" for all categories is valid (clears any existing votes)

**Button styling (from SPEC_Modals.md):**
```tsx
{/* Submit button - purple gradient */}
<button className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase 
  bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg shadow-soft-md 
  hover:scale-102 transition-all">
  Submit Votes
</button>
```

**API handling:**
- `mom: null` = **DELETE** the existing `match_votes` row for that category (clears the vote)
- `mom: 123` = **UPSERT** vote for player 123 (insert or update existing row)
- Key omitted (e.g., `mom` not in request body) = **NO CHANGE** to that category

**Note:** Use `null` to clear/skip. Do NOT use string `'skip'` — keep the API clean.

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

In-app badges only for initial release. No push notifications for chat/voting in Phase 6.

**Future: Push Notifications (with RSVP implementation)**
When RSVP is implemented (see `SPEC_RSVP.md` Section 5), push notifications will be added for:
- `match_report_live` — When match report/stats are published
- `voting_open` — When post-match voting opens (only to players in that match)
- `voting_closed` — When voting closes with results

These are included in the `notification_ledger.kind` CHECK constraint in RSVP spec.

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

**Chat badge:** Store `last_read_at` per user in `chat_user_state`. Compare with latest message timestamp.

**Home badge:** Store `last_viewed_match_id` per user in `user_app_state`. Compare with latest match.

**Row creation timing:**
- Rows are created **lazily on first open** of Chat/Home tab
- `last_read_at` defaults to `now()` — so existing history is marked as "read" on first visit
- This means new users don't see a badge with "500 unread" from historical messages
- Only messages posted AFTER their first visit will count as unread

---

## 5. System Messages

Automated messages posted to chat for key events.

### System Message Triggers

| Event | Message Template | Trigger Location |
|-------|------------------|------------------|
| Match report live | "📊 Match report is live!" | **Worker** — after stats job completes |
| Voting open | "🗳️ Voting is open! Closes in {duration}h" | **Worker** — after survey creation |
| Voting closed (has awards) | "🏆 Voting closed — check the match report for awards!" | **Cron job** — `/api/voting/close-expired` |
| Voting closed (no awards) | "🗳️ Voting closed — no awards this week" | **Cron job** — when all categories skipped |
| Teams published | "⚽ Teams published for {dayOfWeek}'s match!" | **API** — save-teams route |
| New player joined | "👋 Welcome {playerName} to the club!" | **API** — join request approval |

**Dynamic values:**
- `{duration}` = from `voting_duration_hours` config
- `{dayOfWeek}` = Calculated from match date
- `{playerName}` = From approved join request

### Why Worker-Based Triggers (Match Report + Voting)

**Worker triggers system messages** because:
1. Worker knows exactly when stats are complete
2. Frontend polling is unreliable (users might not open app for hours)
3. Messages appear even with no active users
4. Consistent with other system message patterns

**Flow:**
```
Match Completed → Stats Job Queued → Worker Processes Stats
                                            ↓
                              Stats Complete → Post "Match report live!"
                                            ↓
                              Check voting config → Create survey if enabled
                                            ↓
                              Survey created → Post "Voting is open!"
```

**Notes:**
- Match report and voting open are **separate messages** (not bundled)
- Voting message only posted if survey was actually created
- Voting closed message variant determined AFTER tally completes:
  - "check the match report for awards" = at least one category has votes > 0
  - "no awards this week" = ALL categories have zero votes (everyone skipped)

### System Message Styling

**Implemented in `ChatMessage.component.tsx`:**

```tsx
{/* System message - centered, white bg, subtle shadow */}
<div className="flex justify-center my-2 px-4">
  <div className="text-[#9da3aa] text-[12px] text-center bg-white/80 px-3 py-1.5 rounded-lg shadow-sm">
    {message.content}
  </div>
</div>
```

**Key styling:**
- `text-[#9da3aa]` — Grey text (WhatsApp style)
- `text-[12px]` — Small font
- `text-center` — Centered
- `bg-white/80` — Semi-transparent white background
- `rounded-lg` — Consistent with app styling
- `shadow-sm` — Subtle shadow for depth
- No avatar for system messages

### Date Separator Styling

**Implemented in `ChatContainer.component.tsx`:**

```tsx
{/* Date separator - matches incoming bubble styling */}
<div className="flex justify-center my-3">
  <div className="bg-white text-gray-900 text-[12px] font-medium px-3 py-1 rounded-lg shadow-sm">
    {formatDateSeparator(message.createdAt)}
  </div>
</div>
```

**Key styling:**
- `bg-white` — Fully opaque white (same as incoming bubbles)
- `text-gray-900` — Same text color as incoming bubble text
- `shadow-sm` — Subtle shadow to pop against doodle background
- `my-3` — 12px vertical spacing
- `font-medium` — Slightly bolder for emphasis

### System Message Helper Function

**Location:** `src/lib/chat/systemMessage.ts` (shared by API routes, worker, and cron)

```typescript
import { createClient } from '@supabase/supabase-js';

interface SystemMessageOptions {
  tenantId: string;
  content: string;
}

/**
 * Posts a system message to the chat.
 * Uses Supabase client (not Prisma) to trigger Realtime events.
 */
export async function postSystemMessage({ tenantId, content }: SystemMessageOptions): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      tenant_id: tenantId,
      content,
      is_system_message: true,
      author_player_id: null,
      mentions: []
    });
  
  if (error) {
    console.error('Failed to post system message:', error);
    throw error;
  }
}
```

**Consistent usage everywhere:**
```typescript
await postSystemMessage({ tenantId, content: '📊 Match report is live!' });
await postSystemMessage({ tenantId, content: `⚽ Teams published for ${dayOfWeek}'s match!` });
```

**Why Supabase client (not Prisma)?**
- System messages use Supabase client to trigger Realtime events immediately
- Normal messages, deletions, and cleanup use Prisma/SQL
- This is intentional — Realtime subscriptions listen to Supabase changes

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
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  
  -- Author (NULL for system messages)
  author_player_id INTEGER REFERENCES players(player_id) ON DELETE SET NULL,
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Mentions (array of player IDs mentioned in this message, max 10)
  mentions INTEGER[] DEFAULT '{}',
  
  CONSTRAINT mentions_limit CHECK (array_length(mentions, 1) IS NULL OR array_length(mentions, 1) <= 10),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,  -- Soft delete (player self-delete or admin moderation)
  deleted_by_player_id INTEGER REFERENCES players(player_id) ON DELETE SET NULL,  -- Who deleted
  
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
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '😂', '🔥', '❤️', '😮', '👎')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(message_id, player_id, emoji)
);

-- Index for reactions
CREATE INDEX idx_chat_reactions_message 
  ON chat_reactions(message_id);

-- User chat state (for badge tracking)
CREATE TABLE chat_user_state (
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (tenant_id, player_id)
);

-- ============================================
-- VOTING TABLES
-- ============================================

-- Post-match surveys
CREATE TABLE match_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  
  -- Snapshotted data (immutable after creation)
  eligible_player_ids INTEGER[] NOT NULL,  -- Players who played
  enabled_categories TEXT[] NOT NULL,      -- ['mom', 'dod', 'mia']
  
  -- Constraint: only valid category values allowed
  CONSTRAINT valid_categories CHECK (enabled_categories <@ ARRAY['mom','dod','mia']::TEXT[])
  
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
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES match_surveys(id) ON DELETE CASCADE,
  
  -- Voter
  voter_player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  
  -- Vote
  award_type TEXT NOT NULL CHECK (award_type IN ('mom', 'dod', 'mia')),
  voted_for_player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  
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
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES match_surveys(id) ON DELETE CASCADE,
  
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
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  
  last_viewed_match_id INTEGER REFERENCES matches(match_id) ON DELETE SET NULL,
  last_viewed_at TIMESTAMPTZ,
  
  PRIMARY KEY (tenant_id, player_id)
);
```

### Schema Notes

1. **Multi-tenancy:** All tables have `tenant_id` and will use `withTenantFilter()`
2. **Cascade deletes:** All FK relationships use `ON DELETE CASCADE` or `ON DELETE SET NULL`
   - Tenant deletion → all related data deleted
   - Match deletion → survey, votes, awards deleted
   - Player deletion → votes deleted, chat author set to NULL (preserves messages)
3. **Soft deletes:** Chat messages use `deleted_at` for admin moderation (not hard delete)
4. **Vote upsert:** `UNIQUE(survey_id, voter_player_id, award_type)` enables vote changing via upsert
5. **Snapshotted players:** `eligible_player_ids` frozen at survey creation
6. **Award history:** `player_awards` tracks all historical awards for future features
7. **Atomic updates:** When survey closes, update `match_surveys.results` AND insert `player_awards` rows in the same transaction to prevent sync issues
8. **Source of truth:** `player_awards` is the canonical source for award data. `match_surveys.results` is a denormalized cache for quick lookups. Always query `player_awards` for display.

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

**Important notes:**
- Reactions must be deleted BEFORE messages to avoid FK constraint violations
- Soft-deleted messages (`deleted_at IS NOT NULL`) still count toward the 1,000 limit
- This is intentional — we want to prune oldest messages regardless of state
- Result: "[This message was deleted]" placeholders eventually get cleaned up too
- **Limit is per-tenant:** Each tenant keeps their own 1,000 messages (via `PARTITION BY tenant_id`)

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
?before=<message_id>  // For pagination (load older messages)
&limit=50             // Default 50, max 100

// Response
{
  success: true;
  messages: Message[];  // Sorted by created_at DESC (newest first in response)
  hasMore: boolean;
}

// Note: Client reverses array to display oldest-to-newest (standard chat UX)
```

**Soft-deleted messages:**
- Include soft-deleted messages in response (they have `deleted_at` set)
- Client renders them as "[This message was deleted]"
- This preserves conversation flow and context

**Pagination semantics:**
- `before` is a **message ID** (UUID)
- Server looks up that message's `(created_at, id)`, then returns messages where:
  - `(created_at, id) < (anchor.created_at, anchor.id)`
  - Ordered by `(created_at DESC, id DESC)`
- This prevents duplicates/gaps when messages have identical timestamps
- Query uses composite index `(tenant_id, created_at DESC)` for efficiency
- If `before` is omitted, returns the most recent messages
- **If anchor message was deleted by cleanup job:** Server should return 200 with `hasMore: false` (not 404). Client treats this as "end of history".

#### GET /api/chat/unread-count

```typescript
// Response
{
  success: true;
  unreadCount: number;  // Messages since last_read_at
}
```

**Logic:**
```sql
SELECT COUNT(*) FROM chat_messages
WHERE tenant_id = ?
  AND created_at > (SELECT last_read_at FROM chat_user_state WHERE ...)
  AND deleted_at IS NULL  -- Exclude soft-deleted messages
```

**Row creation:** If `chat_user_state` row doesn't exist for this user, create it with `last_read_at = now()` before counting. This ensures new users don't see old history as "unread".

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

**Client error handling:**
- On `400: Survey is closed` → Refetch `/api/voting/active`, update UI to show results
- On `400: You are not eligible` → Show error, hide voting UI for this user

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

### UI Standards Reference

**MUST follow existing patterns:**
- **Modals:** See `SPEC_Modals.md` — use mobile-safe pattern for VotingModal
- **Buttons:** Purple-pink gradient (`from-purple-700 to-pink-500`)
- **Icons:** SVG only in UI (emojis OK in chat content)
- **Forms:** Follow `PlayerFormModal` pattern for input styling

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
│   ├── BottomNavigation.component.tsx   # Update labels, add Chat, add badges (MOBILE)
│   ├── DesktopSidebar.component.tsx     # Update labels, add Chat (DESKTOP)
│   ├── NavigationTabs.component.tsx     # Update for Stats tab structure
│   └── NavigationSubTabs.component.tsx  # Update table/records → stats references
├── icons/
│   └── FireIcon.component.tsx           # Alias to FlameIcon for backward compatibility
└── (various player list components)     # Add award icons by player names
```

### ⚠️ CRITICAL: Navigation Changes Checklist

**When modifying navigation structure, ALWAYS update ALL of these together:**

1. **NavigationContext.tsx** - Primary/secondary/tertiary section types and NAVIGATION_CONFIG
2. **BottomNavigation.component.tsx** - Mobile bottom nav (iOS/Android/mobile web)
3. **DesktopSidebar.component.tsx** - Desktop sidebar navigation
4. **NavigationTabs.component.tsx** - Secondary navigation tabs
5. **NavigationSubTabs.component.tsx** - Tertiary navigation (Points/Goals toggles)

**Failure to update all components will cause TypeScript errors and broken navigation on some platforms.**

### ⚠️ CRITICAL: Supabase Explicit FK Hints (After Chat/Voting)

**The chat/voting tables create multiple FK paths between `players` ↔ `tenants`.**

When using Supabase client to join players with tenants, you MUST use explicit FK hints:

```typescript
// ❌ WRONG - Ambiguous relationship error
.select('player_id, name, tenants(name)')

// ✅ CORRECT - Explicit FK hint
.select('player_id, name, tenants!fk_players_tenant(name)')
```

**Why:** `chat_user_state` and `user_app_state` have FKs to both `players` AND `tenants`, creating multiple join paths. PostgREST can't disambiguate without the hint.

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

1. **Database migration** - Create all new tables (chat + voting)
2. **Navigation restructure** - Merge Tables+Records → Stats, rename Dashboard → Home
3. **Route migration** - Set up new routes with redirects from old
4. **Update NavigationContext** - Add Chat section, update NAVIGATION_CONFIG
5. **Supabase Realtime setup** - Enable publication on chat tables

### Phase 2: Chat Core (Week 1-2)

6. **Chat API routes** - CRUD for messages
7. **System message helper** - `postSystemMessage()` utility function
8. **ChatContainer + ChatMessage** - Basic chat display with Realtime subscription
9. **ChatInput** - Message posting
10. **Chat page** - `/player/chat` with ChatContainer

### Phase 3: Chat Polish (Week 2)

11. **@Mention system** - Autocomplete + highlighting
12. **Reactions** - Add/remove reactions UI
13. **Message deletion** - Self (5 min) + admin (anytime)
14. **Badge system** - Unread count on Chat tab
15. **System messages** - Styling (grey, centered)

### Phase 4: Voting Core (Week 2-3)

16. **Voting admin config** - New setup section in `/admin/setup`
17. **Worker integration** - Add survey creation after stats complete
18. **VotingBanner** - Show on Dashboard when voting active
19. **VotingModal** - Vote submission UI
20. **Vote API** - Submit/update votes with eligibility check

### Phase 5: Voting Results (Week 3)

21. **Cron job setup** - Add `/api/voting/close-expired` to `vercel.json`
22. **Survey closing** - Close + tally + post system message
23. **VotingResults** - Display in MatchReport
24. **Award icons** - Create MoM/DoD/MiA icons (SVG + PNG)
25. **Award display** - Show icons by player names everywhere

### Phase 6: Integration (Week 3)

26. **Worker system messages** - Match report + voting open (after stats)
27. **API system messages** - Teams published + player joined
28. **Home badge** - Badge when match report published
29. **"Open Chat" CTA** - Add to bottom of MatchReport
30. **Chat cleanup cron** - Daily job to keep last 1,000 messages
31. **Testing & polish**

### Deployment Checklist

- [ ] Run database migration (all new tables)
- [ ] Enable Supabase Realtime on chat tables
- [ ] Deploy worker update (survey creation logic)
- [ ] Deploy `vercel.json` with new cron jobs
- [ ] Add voting config defaults to `app_config` for each tenant

---

## 11. Acceptance Criteria

### Chat

- [ ] Players can send messages up to 500 characters
- [ ] Messages appear in real-time for all users
- [ ] @mentions autocomplete with all players (active first, then retired)
- [ ] @mentions visually highlighted in messages
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

**Survey Creation (CRITICAL):**
- [ ] Survey created ONLY on first-time result submission (`result_submitted_at` NULL → timestamp)
- [ ] Survey created ONLY for the latest match (chronologically)
- [ ] Survey NOT created for match edits, re-saves, or score corrections
- [ ] Survey NOT created for historical match edits
- [ ] Survey NOT created when re-running stats worker manually
- [ ] Match deletion cascade deletes survey, votes, and awards

**Voting Flow:**
- [ ] Only players who played can vote (validated against snapshotted `eligible_player_ids`)
- [ ] Only players who played appear as candidates
- [ ] "No-one / Skip" option appears first in each category
- [ ] Players can skip categories or clear previous votes
- [ ] Players can change votes before closing
- [ ] Voting closes after configured duration (default 12h)

**Results & Awards:**
- [ ] Results show after voting closes
- [ ] Ties result in co-winners
- [ ] Award icons appear by winner names until next match report
- [ ] Vote counts displayed with results
- [ ] Voting banner stays visible until close (shows "Change Vote" after voting)
- [ ] "No awards this week" system message if all categories skipped
- [ ] Awards section omits categories with zero votes (no empty blocks)

**Survey Closing:**
- [ ] Cron job runs every 30 minutes to close expired surveys
- [ ] Lazy evaluation closes on access if cron hasn't run yet
- [ ] System message posted when survey closes

### Admin Config

- [ ] Voting section in /admin/setup
- [ ] Toggle for each category (MoM, DoD, MiA)
- [ ] Configurable voting duration
- [ ] Reset to default works correctly

### Navigation

- [x] Dashboard renamed to Home
- [x] Tables + Records merged into Stats
- [x] Stats has Half Season / Season / All Time / Legends secondary nav
- [x] All Time has Leaderboard / Feats tertiary nav
- [x] Legends has Season Winners / Top Scorers tertiary nav
- [ ] Chat tab appears in navigation
- [ ] Old routes redirect to new routes
- [ ] React Query caching still works correctly after migration

### Badges

- [ ] Chat tab shows badge when unread messages exist
- [ ] Badge clears when user opens Chat
- [ ] Home tab shows badge when match report published while user in other tab
- [ ] Badge clears when user opens Home

### System Messages

**Worker-triggered (after stats complete):**
- [ ] "Match report is live!" posted by worker after stats job finishes
- [ ] "Voting is open!" posted by worker after survey creation (if voting enabled)

**Cron-triggered:**
- [ ] "Voting closed — check the match report for awards!" posted when survey closes with winners
- [ ] "Voting closed — no awards this week" posted when all categories skipped

**API-triggered:**
- [ ] "Teams published!" posted when admin saves teams (save-teams API)
- [ ] "Welcome [Name]!" posted when new player approved (approval API)

**General:**
- [ ] System messages styled differently (grey, centered, no avatar)
- [ ] System messages appear in real-time via Supabase Realtime

---

## Appendix: Icon Assets Required

### Emojis vs SVG Icons (Per SPEC_Modals.md)

**❌ NEVER use emojis in UI elements** (buttons, modals, badges, icons next to names)

**✅ Emojis OK in these contexts:**
- System messages in chat (e.g., "📊 Match report is live!") — these are chat content
- Chat reactions (👍 😂 🔥 ❤️ 😮 👎) — user content, not UI chrome

**Must be SVG:**
- Award icons next to player names (MoM, DoD, MiA)
- Icons in voting modal category headers
- Any icon in buttons, badges, or UI chrome

### Icon & Image Assets (COMPLETE ✅)

| Status | SVG Component | PNG Image | Usage |
|--------|---------------|-----------|-------|
| **On Fire** (streak) | `FlameIcon.component.tsx` | `on-fire.png` | Hot streak indicator |
| **Man of the Match** | `StrongmanIcon.component.tsx` | `mom.png` | MoM award |
| **Donkey of the Day** | `DonkeyIcon.component.tsx` | `donkey.png` | DoD award |
| **Missing in Action** | `PossumIcon.component.tsx` | `possum.png` | MiA award |
| **Grim Reaper** | `GrimReaperIcon.component.tsx` | `reaper.png` | Loss streak (existing) |

**File Locations:**
- SVGs: `src/components/icons/`
- PNGs: `public/img/player-status/`

**SVG ViewBox:** All use `0 0 24 24` (scales to any size, crisp at 16px-48px)

### Icon Migration Checklist

When implementing, migrate from old `FireIcon` (strongman) to new icons:

**Replace `FireIcon` imports with `FlameIcon` for "On Fire" streak:**
- [ ] `MatchReport.component.tsx` - On Fire player display
- [ ] `UpcomingMatchCard.component.tsx` - Player pool fire indicator
- [ ] `CurrentForm.component.tsx` - On Fire section
- [ ] Any other components using `FireIcon` for streak

**Add new award icons where needed:**
- [ ] `StrongmanIcon` - For Man of the Match award
- [ ] `DonkeyIcon` - For Donkey of the Day award
- [ ] `PossumIcon` - For Missing in Action award

**Note:** The old `FireIcon.component.tsx` can be kept as an alias to `FlameIcon` for backward compatibility, or deprecated after migration.

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

**Multi-tenancy:** The `filter: tenant_id=eq.${tenantId}` ensures clients only receive events for their tenant. Per the project's architecture, RLS is disabled on operational tables — the Realtime filter is the tenant isolation mechanism for subscriptions. The `tenantId` comes from the authenticated user's profile (already validated server-side).

**Event ordering:** Supabase Realtime does NOT guarantee event ordering across tables. Clients must handle:
- Reaction DELETE arriving after message UPDATE → ignore orphaned reaction
- Message UPDATE arriving before reaction DELETE → temporarily show stale count until DELETE arrives

**Client UPDATE handling:** Only treat UPDATE as deletion if `deleted_at` changed:
```typescript
if (payload.new.deleted_at && payload.new.deleted_at !== payload.old?.deleted_at) {
  // This is a soft-delete, render as "[This message was deleted]"
}
```

### Mobile Realtime Behavior

**Expected behavior on iOS/Android (Capacitor):**
- App goes to background → WebSocket disconnects
- App returns to foreground → shows "connecting..." briefly (1-2 seconds)
- Automatically resubscribes and fetches missed messages
- No user action required

This is standard behavior for all realtime systems (Discord, Slack, WhatsApp). **Acceptable and expected.**

---

## Appendix: Survey Creation Rules (CRITICAL)

### When to Create a Survey

A survey is created **ONLY** when ALL of these conditions are true:

1. **First-time result submission** — `result_submitted_at` transitions from `NULL` → timestamp
2. **Latest match** — This is the chronologically most recent match
3. **Voting enabled** — `voting_enabled = true` in app_config
4. **No existing survey** — No `match_surveys` row exists for this match

### When NOT to Create a Survey

**Survey creation MUST NEVER occur on:**

| Scenario | Why |
|----------|-----|
| Match edits | Editing score/players after initial submission |
| Match re-saves | Admin saves same match again |
| Score corrections | Fixing typos in goals |
| Player adjustments | Adding/removing players retroactively |
| Historical match edits | Editing any non-latest match |
| Re-running stats worker | Manual stats refresh |
| Match deletion + recreation | New match_id = no survey link |

**Detection Logic:**

```typescript
// In worker after stats complete
async function shouldCreateSurvey(
  matchId: number, 
  tenantId: string, 
  isFirstSubmission: boolean
): Promise<boolean> {
  // 1. FIRST CHECK: Was this a first-time submission?
  // This flag is determined by the API (not frontend) — see Worker Job Types appendix
  if (!isFirstSubmission) {
    console.log('Skipping survey: not first submission');
    return false;
  }
  
  // 2. Check if this is the latest match
  const isLatestMatch = await checkIsLatestMatch(matchId, tenantId);
  if (!isLatestMatch) {
    console.log('Skipping survey: not latest match');
    return false;
  }
  
  // 3. Check if survey already exists (belt-and-suspenders)
  const existingSurvey = await prisma.match_surveys.findFirst({
    where: { match_id: matchId, tenant_id: tenantId }
  });
  if (existingSurvey) {
    console.log('Skipping survey: already exists');
    return false;
  }
  
  // 4. Check if voting is enabled
  const votingEnabled = await getConfig('voting_enabled', tenantId);
  if (!votingEnabled) {
    console.log('Skipping survey: voting disabled');
    return false;
  }
  
  return true;
}
```

**Note:** `isFirstSubmission` is determined by the `/complete` API route (not frontend) by checking if a match record already exists for that `upcoming_match_id`. This is the primary safeguard.

### Survey Creation — Race Condition Handling

**Concurrent submission protection:**
```typescript
// Survey creation must handle unique-constraint conflicts gracefully
try {
  await prisma.match_surveys.create({
    data: { tenant_id, match_id, eligible_player_ids, ... }
  });
} catch (error) {
  if (error.code === 'P2002') {  // Unique constraint violation
    // Another worker created it first — safe to ignore
    console.log('Survey already exists, skipping creation');
    return;
  }
  throw error;
}
```

The `UNIQUE(tenant_id, match_id)` constraint prevents duplicate surveys even under concurrent worker execution.

### Match Deletion Cascade Rules

When a match is deleted, **cascade delete all related voting data:**

```sql
-- Foreign key cascades handle this automatically
-- But for clarity, the deletion order is:

1. player_awards (depends on survey_id, match_id)
2. match_votes (depends on survey_id)
3. match_surveys (depends on match_id)
4. matches (the match itself)
```

**Schema enforcement:**

```sql
-- In match_surveys table
REFERENCES matches(match_id) ON DELETE CASCADE

-- In match_votes table  
REFERENCES match_surveys(id) ON DELETE CASCADE

-- In player_awards table
REFERENCES match_surveys(id) ON DELETE CASCADE
REFERENCES matches(match_id) ON DELETE CASCADE
```

**Result:** Deleting a match automatically removes its survey, votes, and awards. No orphaned records.

### Edge Cases

| Case | Behavior |
|------|----------|
| Delete latest match with active survey | Survey + votes deleted, voting ends |
| Delete latest match after voting closed | Survey + votes + awards deleted |
| Delete old match with historical survey | Survey + votes + awards deleted |
| Delete match that never had a survey | Nothing to clean up |
| Delete match, then undo (recreate) | New match_id, no survey connection |

---

## Appendix: Survey Closing Mechanism

### Hybrid Approach: Cron + Lazy Evaluation

**Why hybrid?**
- Cron ensures surveys close even if no users are active
- Lazy evaluation provides immediate feedback when users access

### Cron Job (Every 30 minutes)

**Add to `vercel.json`:**

```json
{
  "path": "/api/voting/close-expired",
  "schedule": "*/30 * * * *"
}
```

**API Route: `/api/voting/close-expired`**

```typescript
// Called by Vercel cron every 30 minutes (GET is standard for Vercel crons)
export async function GET(request: NextRequest) {
  // 1. Find all expired surveys (is_open = true AND voting_closes_at < now)
  const expiredSurveys = await prisma.match_surveys.findMany({
    where: {
      is_open: true,
      voting_closes_at: { lt: new Date() }
    }
  });
  
  // 2. Close each — closeSurveyAndTally handles tally + system message
  let closedCount = 0;
  for (const survey of expiredSurveys) {
    const closed = await closeSurveyAndTally(survey.id, survey.tenant_id);
    if (closed) closedCount++;
  }
  
  return NextResponse.json({ closed: closedCount });
}
```

**Note:** `closeSurveyAndTally` is the single source of truth for closing logic. It handles: DB update, tally, awards insertion, AND system message. Both cron and lazy evaluation call it directly.

### Lazy Evaluation (On Access)

When user accesses voting or match report:

```typescript
// In voting API or match report API
const survey = await getSurveyForMatch(matchId, tenantId);

if (survey?.is_open && new Date(survey.voting_closes_at) < new Date()) {
  // Survey expired but not yet closed by cron — close it now
  await closeSurveyAndTally(survey.id, tenantId);
}
```

**Timing:** Max 30-minute delay from exact close time (cron interval), but immediate if user accesses first.

### Idempotent Closing (CRITICAL)

`closeSurveyAndTally()` is the **single source of truth** for closing surveys. It handles:
1. DB update (set `is_open = false`)
2. Vote tallying
3. Award insertion
4. System message posting

Both cron and lazy evaluation call this function directly.

```typescript
async function closeSurveyAndTally(surveyId: string, tenantId: string): Promise<boolean> {
  // Use WHERE is_open = true to prevent double-processing
  const result = await prisma.match_surveys.updateMany({
    where: { id: surveyId, is_open: true },  // Only if still open
    data: { is_open: false, closed_at: new Date() }
  });
  
  if (result.count === 0) {
    // Already closed by another process — skip everything
    return false;
  }
  
  // Tally votes and insert awards
  const hasAwards = await tallyAndInsertAwards(surveyId);
  
  // Post system message (only if we actually closed it)
  const message = hasAwards 
    ? '🏆 Voting closed — check the match report for awards!'
    : '🗳️ Voting closed — no awards this week';
  await postSystemMessage({ tenantId, content: message });
  
  return true;
}
```

**Why idempotent:** Prevents double system messages when cron and lazy evaluation race. The `WHERE is_open = true` guard ensures only one caller succeeds.

---

## Appendix: System Message Trigger Points

### Message Trigger Architecture

| Message | Trigger Location | Trigger Mechanism |
|---------|------------------|-------------------|
| Match report live | Worker | After stats job completes |
| Voting open | Worker | After survey creation (same as above) |
| Voting closed | Cron job | `/api/voting/close-expired` |
| Teams published | API | `/api/admin/upcoming-matches/[id]/save-teams` |
| New player joined | API | `/api/admin/join-requests/[id]/approve` |

### Worker Integration (Match Report + Voting Open)

**File: `worker/src/jobs/statsUpdateJob.ts`**

```typescript
export async function processStatsUpdateJob(
  jobId: string,
  payload: StatsUpdateJobPayload
): Promise<void> {
  // ... existing stats processing ...
  
  // After all stats complete successfully:
  if (payload.triggeredBy === 'post-match' && payload.isFirstSubmission) {
    await handlePostMatchActions(payload);
  }
}

async function handlePostMatchActions(payload: StatsUpdateJobPayload): Promise<void> {
  const { matchId, tenantId } = payload;
  
  // 1. Check if this is the latest match
  const isLatest = await isLatestMatch(matchId, tenantId);
  if (!isLatest) return;
  
  // 2. Post "Match report is live!" message
  await postSystemMessage({ tenantId, content: '📊 Match report is live!' });
  
  // 3. Create survey if voting enabled
  const votingEnabled = await getConfig('voting_enabled', tenantId);
  if (votingEnabled) {
    const survey = await createSurvey(matchId, tenantId);
    if (survey) {
      // 4. Post "Voting is open!" message
      const durationHours = await getConfig('voting_duration_hours', tenantId);
      await postSystemMessage({ tenantId, content: `🗳️ Voting is open! Closes in ${durationHours}h` });
    }
  }
}
```

### API Triggers (Teams Published, Player Joined)

**Teams Published — modify existing route:**

```typescript
// src/app/api/admin/upcoming-matches/[id]/save-teams/route.ts

// After successful team save:
await postSystemMessage({ tenantId, content: `⚽ Teams published for ${dayOfWeek}'s match!` });
```

**Player Joined — modify existing route:**

```typescript
// src/app/api/admin/join-requests/[id]/approve/route.ts

// After successful approval:
await postSystemMessage({ tenantId, content: `👋 Welcome ${playerName} to the club!` });
```

---

## Appendix: Worker Job Types

### Extended Job Type System

**File: `worker/src/types/jobTypes.ts`**

```typescript
// No new job types needed — survey closing is handled by Vercel cron, not worker queue
export type JobType = 'stats_update';  // Unchanged

export interface StatsUpdateJobPayload {
  triggeredBy: 'post-match' | 'admin' | 'cron';
  matchId?: number;
  tenantId: string;
  requestId: string;
  timestamp: string;
  isFirstSubmission?: boolean;  // NEW: true only on first result entry
}

// Note: survey_create is handled inline after stats complete
// survey_close is handled by cron, not worker queue
```

### Payload Enhancement for First Submission Detection

**🚨 CRITICAL:** The `isFirstSubmission` flag is the most important safeguard against duplicate surveys.

**Determination logic (in API route, NOT frontend):**

```typescript
// src/app/api/admin/upcoming-matches/[id]/complete/route.ts

// BEFORE creating the match record, check if this is truly first submission
const existingMatch = await prisma.matches.findFirst({
  where: { upcoming_match_id: matchId, tenant_id: tenantId }
});

const isFirstSubmission = !existingMatch;  // true ONLY if no match record exists yet

// Pass to stats job
await enqueueStatsJob({
  triggeredBy: 'post-match',
  matchId: newMatch.match_id,
  tenantId,
  isFirstSubmission  // Determined by API, not frontend
});
```

**Why API-side detection?**
- Frontend doesn't know if match was already submitted
- API can check database state definitively
- Prevents race conditions and user manipulation

**File: `src/app/api/admin/enqueue-stats-job/route.ts`**

```typescript
// Pass through isFirstSubmission in payload
const payload = {
  triggeredBy: body.triggeredBy,
  matchId: body.matchId,
  tenantId,
  requestId: body.requestId,
  isFirstSubmission: body.isFirstSubmission ?? false  // Default false for safety
};
```

**Default false = safe:** If flag is missing or undefined, survey is NOT created. This prevents accidental survey creation from manual stats reruns or legacy code paths.

---

**End of Specification**
