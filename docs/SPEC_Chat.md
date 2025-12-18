# Chat Specification

**Version:** 1.0.0  
**Last Updated:** December 18, 2025  
**Status:** Implemented  
**Split from:** SPEC_Chat_And_Voting.md (v1.4.0)

---

## Overview

Global team chat for the entire club. Replaces WhatsApp group for team banter.

**Key principle:** Low friction, high engagement. Features must be obvious and easy to use or players will revert to WhatsApp.

---

## Core Features

| Feature | Details |
|---------|---------|
| Message posting | Text + Unicode emojis, 500 char limit |
| @mentions | Autocomplete from player list, highlights in message |
| Reactions | Fixed emoji set: 👍 😂 🔥 ❤️ 😮 👎 |
| History | Last 1,000 messages retained (via scheduled cleanup job) |
| Moderation | Admin can delete messages |
| Real-time | Supabase Realtime for live updates |

---

## Who Can Chat

| Role | Can Post | Can React | Can @Mention | Can Delete |
|------|----------|-----------|--------------|------------|
| Active Player | ✅ | ✅ | ✅ | Own (5 min) |
| Retired Player | ✅ | ✅ | ✅ | Own (5 min) |
| Admin | ✅ | ✅ | ✅ | Any (no limit) |

---

## @Mentions

1. User types `@` → autocomplete dropdown appears
2. Dropdown shows ALL players (active first, then retired in "Retired" section)
3. User selects player → `@PlayerName` inserted
4. Mention renders with visual highlight (bold or colored)
5. Manually typed `@NonExistent` treated as plain text

**Why include retired players?** Club banter often references past players. They're part of club history.

---

## Reactions

**Fixed emoji set:** 👍 😂 🔥 ❤️ 😮 👎

**Interaction:**
- Tap message → emoji picker appears
- Tap emoji to add reaction, tap again to remove
- Reactions display as small row under message with counts
- Tap reaction chips → "Who Reacted" bottom sheet

**Not allowed on:** System messages, deleted messages

---

## Message Deletion

| Who | Can Delete | Time Limit |
|-----|------------|------------|
| Player (own message) | ✅ | Within 5 minutes |
| Admin (any message) | ✅ | No limit |

- **No editing** - Prevents trust issues, keeps chat authentic
- **Personalized text:** Self-delete shows "You deleted this message"
- **Consecutive collapse:** 2+ deleted messages → single "[X messages deleted]" entry

---

## Chat UI Layout

WhatsApp-style chat with date separators.

| Element | Styling |
|---------|---------|
| Background | Doodle pattern on `#ECE5DD` (`/img/chat-bg.webp`) |
| Outgoing bubbles | Purple (`bg-[#A855F7]`) + shadow, aligned right |
| Incoming bubbles | White + shadow, aligned left |
| Avatar | 24px club badge, bottom-left of last message in group |
| Date separators | White pill, centered, shadow-sm |
| System messages | Pink pill (`bg-pink-500 text-white`), centered |

**Date Separator Format:**
- Today: "Today"
- Yesterday: "Yesterday"
- Within 7 days: Day name (e.g., "Friday")
- Older: "Wed, 3 Dec" format

---

## Chat Loading

1. Open chat → load most recent 50 messages
2. Scroll UP to load older (paginated, 50 at a time)
3. New messages appear at bottom in real-time
4. If scrolled up when new messages arrive → show "↓ New messages" banner

---

## Badge Notification

| Condition | Badge |
|-----------|-------|
| Unread messages exist | Red dot on Chat tab |
| User opens Chat | Badge clears |

**Implementation:** `chat_user_state.last_read_at` compared to latest message timestamp.

**Row creation:** Created lazily on first Chat open. `last_read_at = now()` so existing history is marked "read".

---

## System Messages

Automated messages for key events:

| Event | Message | Trigger |
|-------|---------|---------|
| Match report live | "📊 Match report is live!" | Worker |
| Voting open | "🗳️ Voting is open! Closes in {duration}h" | Worker |
| Voting closed (has awards) | "🏆 Voting closed — check the match report!" | Cron |
| Voting closed (no awards) | "🗳️ Voting closed — no awards this week" | Cron |
| Teams published | "⚽ Teams published for {day}'s match!" | API |
| New player joined | "👋 Welcome {name} to the club!" | API |

---

## Database Schema

```sql
-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  author_player_id INTEGER REFERENCES players(player_id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  mentions INTEGER[],
  is_system BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by_player_id INTEGER REFERENCES players(player_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT author_or_system CHECK (
    (is_system = true AND author_player_id IS NULL) OR
    (is_system = false AND author_player_id IS NOT NULL)
  )
);

CREATE INDEX idx_chat_messages_tenant_created 
  ON chat_messages(tenant_id, created_at DESC);

-- Chat reactions
CREATE TABLE chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '😂', '🔥', '❤️', '😮', '👎')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(message_id, player_id, emoji)
);

-- User chat state (for badge tracking)
CREATE TABLE chat_user_state (
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (tenant_id, player_id)
);
```

---

## API Routes

```
POST   /api/chat/messages           - Send message
GET    /api/chat/messages           - Get messages (paginated, ?before=<id>&limit=50)
DELETE /api/chat/messages/[id]      - Delete message
POST   /api/chat/messages/[id]/react - Add/remove reaction
GET    /api/chat/unread-count       - Get unread count for badge
POST   /api/chat/mark-read          - Mark messages as read
```

---

## Supabase Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
```

Client subscribes with tenant filter for isolation.

**Mobile behavior:** App background → WebSocket disconnects → foreground → auto-reconnects. This is expected behavior.

---

## Chat Cleanup Job

Runs daily via pg_cron to keep last 1,000 messages per tenant:

```sql
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
  -- Delete reactions first (FK constraint)
  DELETE FROM chat_reactions WHERE message_id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as rn
      FROM chat_messages
    ) ranked WHERE rn > 1000
  );
  
  -- Then delete old messages
  DELETE FROM chat_messages WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as rn
      FROM chat_messages
    ) ranked WHERE rn > 1000
  );
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('cleanup-chat-messages', '0 3 * * *', 'SELECT cleanup_old_chat_messages()');
```

---

## UI Components

```
src/components/chat/
├── ChatContainer.component.tsx      # Main chat wrapper
├── ChatMessage.component.tsx        # Individual message
├── ChatInput.component.tsx          # Message input with @mention
├── ChatReactions.component.tsx      # Reaction display/picker
├── ChatSystemMessage.component.tsx  # System message styling
├── MentionAutocomplete.component.tsx # @mention dropdown
└── index.ts
```

---

**End of Specification**

