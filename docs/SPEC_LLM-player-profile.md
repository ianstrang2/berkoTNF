# LLM Player Profile Generation Specification

**Version:** 1.0  
**Last Updated:** November 26, 2025  
**Status:** ✅ Production Complete

---

## Overview

AI-generated player biographies that enhance player profile screens with rich, contextual narratives. Uses individual processing with league context approach.

**Key Features:**
- Individual processing with league context per call
- Dynamic profile length based on career depth (50-450 words)
- Comparative insights (league records, rankings, percentiles)
- Rich narrative with historical context and teammate chemistry
- Automated weekly generation via cron job
- Admin dashboard for management and statistics

**Model:** `google/gemini-2.5-flash-lite` via OpenRouter  
**Cost:** ~$0.012 per batch  
**Frequency:** Weekly (Sundays 11 PM UTC)

---

## Current Architecture

### Generation Approach

**Individual Processing with League Context:**
- Each player gets separate LLM call
- Includes full league data for comparative context
- Prevents cross-player data contamination
- Maintains rich narrative capability

**Benefits:**
- Clean data attribution
- Flexible prompt per player
- No batch size limits
- Better error isolation

### Data Sources

**14 Aggregated Tables Per Player:**
- `aggregated_half_season_stats` - Current period performance
- `aggregated_all_time_stats` - Career totals
- `aggregated_hall_of_fame` - All-time records
- `aggregated_recent_performance` - Last 5 games
- `aggregated_season_honours_and_records` - Awards and achievements
- `aggregated_personal_bests` - Career highlights
- `aggregated_player_profile_stats` - Complete player profile
- `aggregated_player_teammate_stats` - Partnership chemistry
- `aggregated_player_power_ratings` - Historical power rating trends
- Plus 5 more tables for comprehensive context

**League-Wide Context:**
- League age (years since first match)
- Player count and career stages
- League scale (avg games per year)
- All-time records for comparison
- Season honours for context

---

## Generation Logic

### When to Generate Profile

**Rule-based system:**

```typescript
// Generate if:
(player.profile_text === null)  // Never generated
OR 
(player.has_recent_match_in_last_N_days)  // Recent activity
OR
(player.profile_generated_at > 30_days_ago)  // Stale profile

// Skip if:
(player.is_retired === true)  // Retired players
OR
(player.matches_played < 5)  // Insufficient data
```

**Configuration:**
- `PROFILE_RECENT_DAYS_THRESHOLD=7` (env variable)
- Minimum matches: 5 games

### Profile Length Scaling

**Dynamic based on career depth:**

```typescript
if (matches < 25) {
  length = '50-100 words';  // New players - potential focused
} else if (matches < 75) {
  length = '100-200 words';  // Developing - form and trends
} else if (matches < 200) {
  length = '200-350 words';  // Established - rich history
} else {
  length = '350-450 words';  // Veterans - comprehensive retrospective
}
```

### Narrative Focus

**Automatically adapts to player tier:**

**New Players (< 25 games):**
- Focus on potential and early impressions
- Recent performance emphasized
- Brief and optimistic

**Established Players (75-200 games):**
- Career progression and milestones
- Streaks and notable performances
- Teammate partnerships

**Veterans (200+ games):**
- Comprehensive career retrospective
- Season-by-season evolution
- Legacy and all-time standings

---

## Database Schema

### players table

**Profile fields:**
```typescript
profile_text: string | null           // Generated biography
profile_generated_at: DateTime | null // Last generation timestamp
```

### SQL Export Functions

**`export_league_data_for_profiles(target_tenant_id)`**
- Returns league-wide context
- Auto-calculates league age, scale, career stages
- Returns list of eligible player IDs

**`export_individual_player_for_profile(player_id, target_tenant_id)`**
- Returns individual player data from 14 tables
- Includes league context for comparisons
- Comprehensive dataset for rich narratives

---

## API Routes

**`POST /api/admin/trigger-player-profiles`**
- Manual/cron trigger for profile generation
- Identifies eligible players
- Enqueues generation job
- Returns: Job status

**`GET /api/admin/player-profile-metadata`**
- Profile statistics (total, generated, pending)
- Generation health metrics
- Admin dashboard data

**`POST /api/admin/reset-player-profiles`**
- Clear all profiles
- Regenerate from scratch
- Admin emergency tool

---

## Edge Function

**File:** `supabase/functions/generate-player-profiles/index.ts`

**Process:**
1. Receive request with tenant_id
2. Export league data via SQL function
3. For each eligible player:
   - Export individual player data
   - Build prompt with league context
   - Call OpenRouter API
   - Update `players.profile_text` and `profile_generated_at`
4. Return summary (success/failure counts)

**Prompt Pattern:**
```
You are generating funny, only-positive football player profiles.

COMPLETE LEAGUE CONTEXT:
[League age, scale, records, etc.]

PLAYER DATA:
[Individual stats from 14 tables]

RULES:
- Length: [Dynamic based on games played]
- Tone: Warm, funny, WhatsApp-friendly
- Focus: [Career-stage appropriate]
- Format: Plain text, no markdown
```

---

## Cron Integration

**File:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/admin/trigger-player-profiles",
    "schedule": "0 23 * * 0"
  }]
}
```

**Schedule:** Weekly (Sundays 11 PM UTC)  
**Follows existing pattern:** Same as `trigger-stats-update`

---

## Admin UI Integration

**Location:** `/admin/info` page

**Features:**
- Profile generation statistics
- Last generation timestamp
- Success/failure metrics
- Manual trigger button
- Reset all profiles button

**Display:**
```typescript
interface ProfileMetadata {
  total_players: number;
  profiles_generated: number;
  profiles_pending: number;
  last_generation_at: DateTime | null;
}
```

---

## Error Handling

**Configuration Errors:**
- Missing OpenRouter API key → Return 500 with clear message
- Invalid tenant_id → Return 400

**Generation Errors:**
- LLM API timeout → Skip player, continue batch
- Invalid response → Log error, skip player
- Quota exceeded → Return 429, retry later

**Monitoring:**
- Track success/failure counts
- Log generation times
- Alert on high failure rates (> 10%)

---

## Cost Analysis

**Per Player:**
- Prompt: ~15KB (league + individual data)
- Response: ~300-400 words
- Cost: ~$0.0012 per player

**Per Batch (Weekly):**
- 10 eligible players: $0.012
- 50 eligible players: $0.060
- 100 eligible players: $0.120

**Annual Cost (100 players):**
- Weekly generation: ~$6.24/year
- Negligible for SaaS operations

---

## Future Enhancements

**Not Yet Implemented:**
- Player feedback on profiles (like/dislike)
- A/B testing different prompt styles
- Multi-language support
- Voice narration option
- Profile revision history
- Custom profile templates per club

---

**Document Status:** ✅ Production Complete  
**Last Updated:** November 26, 2025  
**Version:** 1.0
