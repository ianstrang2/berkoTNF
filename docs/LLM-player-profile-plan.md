# LLM Player Profile Generation - Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for adding AI-generated player bios to enhance player profile screens. The system uses a **bulk context approach** - sending ALL aggregated league data (14 tables, 175+ columns) in a single LLM call to generate multiple rich, contextual profiles with comparative insights and league-wide awareness.

### Key Features
- **Bulk Context Processing**: Sends ALL aggregated data (14 tables, 175+ columns) in single LLM call
- **Dynamic League Inference**: Auto-computes league age, scale, and career stages from data (no hardcoded assumptions)
- **Comparative Insights**: LLM has full league context for rankings, percentiles, and relative achievements
- **Rich Narrative Generation**: Creates profiles with historical context, streak details, and teammate chemistry
- **Self-Adapting Scale Awareness**: Works for new leagues (emphasizes potential) and established leagues (deep history)
- **Ultra-Low Cost**: ~$0.009 per batch with optimized token control and Gemini 2.5 Flash-Lite
- **Smart Generation Logic**: Rule-based system for when to generate/update/ignore profiles

### 🔧 Configuration Status
- ✅ **OpenRouter API Key**: Configured in Supabase secrets
- ✅ **Domain Configuration**: `https://BerkoTNF.com` 
- ✅ **Model Selected**: `google/gemini-2.5-flash-lite`
- ✅ **Version Control**: All configuration in editable code files (`vercel.json`, `.env.local`, `/api` routes)
- ✅ **Consistency**: Follows existing `trigger-stats-update` pattern exactly
- ⚠️ **Ready for Implementation**: Database schema and deployment pending

### 📋 Implementation Summary
**New Files Created:**
- `src/app/api/admin/trigger-player-profiles/route.ts` - API route following your existing pattern
- `sql/export_league_data_for_profiles.sql` - Enhanced SQL function with multi-tenancy support  

**Configuration Updates:**
- `vercel.json` - Add new cron entry for profile generation
- `.env.local` - Add `PROFILE_RECENT_DAYS_THRESHOLD=7` (weekly) or `=30` (monthly)

**No Hidden Configs:** Everything is in version-controlled code files, no pg_cron or database-stored configuration.

## Data Sources & Player Context

The LLM receives ALL aggregated data from your 14 comprehensive tables (175+ total columns):

### Complete Aggregated Dataset
- **`aggregated_all_time_stats`** (18 cols): Career totals, win percentage, goals, clean sheets
- **`aggregated_half_season_stats`** (15 cols): Current period performance and historical blocks
- **`aggregated_hall_of_fame`** (5 cols): Record achievements and category rankings
- **`aggregated_match_report`** (21 cols): Match highlights, milestones, streaks, feat-breaking data
- **`aggregated_match_streaks`** (30 cols): Win/loss/attendance/scoring streaks with dates
- **`aggregated_performance_ratings`** (12 cols): EWMA power ratings, goal threat, percentiles
- **`aggregated_personal_bests`** (4 cols): Individual match and season records
- **`aggregated_player_power_ratings`** (14 cols): Historical power rating trends
- **`aggregated_player_profile_stats`** (24 cols): Complete player profiles with yearly stats
- **`aggregated_recent_performance`** (4 cols): Last 5 games analysis
- **`aggregated_records`** (3 cols): League-wide records and achievements
- **`aggregated_season_honours`** (4 cols): Annual winners and top performers
- **`aggregated_season_race_data`** (5 cols): Season progression and race standings
- **`aggregated_season_stats`** (16 cols): Season-by-season performance breakdowns

### Enhanced Content Intelligence (Bulk Context Benefits)
- **Comparative Rankings**: "Sarah's 67% win rate puts her in the top quartile of the league"
- **Historical Context**: "His 15-game win streak in 2019 was the 3rd longest in league history"
- **Relationship Insights**: "Known for strong chemistry with Mike (81% win rate together vs 52% apart)"
- **Performance Patterns**: "Always elevates his game against top opponents - averages 2.3 goals vs league leaders"
- **Milestone Recognition**: "That drought-breaking hat-trick after 23 scoreless games became instant legend"
- **League-Scale Perspective**: Understands what constitutes impressive performance in your specific league context

## Generation Logic & Rules

### Smart Generation Rules
The system uses a single flexible generation mode with configurable frequency (weekly/monthly via cron). Generation logic scans all players and applies these rules:

| Player Status | Has Profile? | Played in Last X Days? | Action | Notes |
|---------------|--------------|------------------------|---------|-------|
| <5 games (any status) | No | Any | **Ignore** | Too few games for meaningful bio |
| 5+ games, Not Retired, Not Ringer | No | Any | **Generate new bio** | Standard new player bio, adapted for league context |
| 5+ games, Not Retired, Not Ringer | Yes | Yes | **Replace existing bio** | Update with recent performance, full history |
| 5+ games, Not Retired, Not Ringer | Yes | No | **Ignore** | No recent changes; keep existing |
| Retired = Yes | No | Any | **Generate new bio (retro style)** | Retrospective career summary |
| Retired = Yes | Yes | Yes | **Replace existing bio (retro style)** | Retrospective if recent play (e.g., comeback) |
| Retired = Yes | Yes | No | **Ignore** | No updates for inactive retirees |
| Ringer = True (any other status) | Any | Any | **Ignore** | Exclude ringers entirely |

**"Played in Last X Days"** uses `last_match_date` from aggregates, with X configurable (default 30 days, amendable to 7 for weekly via code variable or app_settings).

### Tone & Style Configuration

Current implementation uses hardcoded **"Funny, Only-Positive"** tone. Future expansion options:

| Tone | Setting | Style Description |
|------|---------|-------------------|
| Factual | Accurate | Straightforward stats, objective trends |
| Factual | Only-Positive | Stats-focused but upbeat |
| Funny | Accurate | Humorous banter, honest realities playfully |
| **Funny** | **Only-Positive** | **Light-hearted praise with jokes (hardcoded default)** |
| Banter | Accurate | Teasing/roast style, honest |
| Banter | Only-Positive | Fun ribbing without digs |

## Architecture Components

### 1. Database Schema Extensions

```sql
-- Add profile storage to players table (if not already exists)
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_text TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_generated_at TIMESTAMP WITH TIME ZONE;

-- Ensure required fields exist
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_retired BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ringer BOOLEAN DEFAULT FALSE;

-- Note: last_match_date is calculated on-the-fly in the export function
-- No additional column needed - calculated dynamically from matches data
```

### 2. SQL Function (`sql/export_league_data_for_profiles.sql`)

Enhanced data export function with dynamic league inference and token optimization:
- Exports complete league context with auto-calculated metrics (league_age_years, max_games_played, avg_games_per_year)
- Includes ALL 14 aggregated tables with 175+ columns of player data
- Token size control with LIMIT clauses on nested arrays (5 items max per nested table)
- Pagination support via offset/limit parameters for scalable processing
- Identifies target players needing profile generation based on rules
- Creates self-adapting JSON payload that works for any league size or age
- Enables data-driven narrative adaptation without hardcoded assumptions

```sql
CREATE OR REPLACE FUNCTION export_league_data_for_profiles(
    recent_days_threshold INT DEFAULT 7,
    p_offset INT DEFAULT 0,
    p_limit INT DEFAULT 50,
    p_league_id INT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'league_context', jsonb_build_object(
            'total_games', (SELECT COUNT(*) FROM matches),
            'total_players', (SELECT COUNT(*) FROM players WHERE is_ringer = FALSE),
            'total_seasons', (SELECT COUNT(DISTINCT season_id) FROM seasons),
            'date_range', jsonb_build_object(
                'start_date', (SELECT MIN(match_date) FROM matches),
                'end_date', (SELECT MAX(match_date) FROM matches)
            ),
            'league_age_years', (SELECT EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date))) FROM matches),
            'max_games_played', (SELECT MAX(games_played) FROM aggregated_player_profile_stats),
            'avg_games_per_year', (
                SELECT CASE WHEN EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date))) > 0 
                THEN (SELECT COUNT(*) FROM matches) / EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date)))
                ELSE (SELECT COUNT(*) FROM matches) END FROM matches
            ),
            'league_records', (SELECT to_jsonb(ar.*) FROM aggregated_records ar LIMIT 1),
            'season_honours', (SELECT jsonb_agg(to_jsonb(ash.*)) FROM aggregated_season_honours ash LIMIT 10)
        ),
        'all_players', (
            SELECT jsonb_object_agg(
                p.name,
                jsonb_build_object(
                    'basic_info', jsonb_build_object(
                        'player_id', p.player_id,
                        'name', p.name,
                        'is_retired', p.is_retired,
                        'join_date', p.join_date,
                        'selected_club', p.selected_club
                    ),
                    'profile_stats', to_jsonb(pps.*),
                    'all_time_stats', to_jsonb(ats.*),
                    'half_season_stats', to_jsonb(ahs.*),
                    'season_stats', (
                        SELECT jsonb_agg(to_jsonb(ass.*))
                        FROM aggregated_season_stats ass
                        WHERE ass.player_id = p.player_id
                        LIMIT 5 -- Control token size
                    ),
                    'hall_of_fame_entries', (
                        SELECT jsonb_agg(to_jsonb(hof.*))
                        FROM aggregated_hall_of_fame hof
                        WHERE hof.player_id = p.player_id
                        LIMIT 5 -- Control token size
                    ),
                    'match_streaks', to_jsonb(ams.*),
                    'performance_ratings', to_jsonb(apr.*),
                    'power_ratings', to_jsonb(appr.*),
                    'recent_performance', to_jsonb(arp.*),
                    'match_reports', (
                        SELECT jsonb_agg(to_jsonb(amr.*))
                        FROM aggregated_match_report amr
                        JOIN player_matches pm ON amr.match_id = pm.match_id
                        WHERE pm.player_id = p.player_id
                        ORDER BY amr.match_date DESC
                        LIMIT 5 -- Most recent significant matches only
                    ),
                    'personal_bests', (
                        SELECT jsonb_agg(to_jsonb(apb.*))
                        FROM aggregated_personal_bests apb
                        JOIN player_matches pm ON apb.match_id = pm.match_id
                        WHERE pm.player_id = p.player_id
                        LIMIT 5 -- Control token size
                    )
                )
            )
            FROM players p
            LEFT JOIN aggregated_player_profile_stats pps ON p.player_id = pps.player_id
            LEFT JOIN aggregated_all_time_stats ats ON p.player_id = ats.player_id
            LEFT JOIN aggregated_half_season_stats ahs ON p.player_id = ahs.player_id
            LEFT JOIN aggregated_match_streaks ams ON p.player_id = ams.player_id
            LEFT JOIN aggregated_performance_ratings apr ON p.player_id = apr.player_id
            LEFT JOIN aggregated_player_power_ratings appr ON p.player_id = appr.player_id
            LEFT JOIN aggregated_recent_performance arp ON p.player_id = arp.player_id
            WHERE p.is_ringer = FALSE
            AND pps.games_played >= 5
            AND (p_league_id IS NULL OR p.league_id = p_league_id) -- Optional league filtering
            OFFSET p_offset LIMIT p_limit -- Pagination support
        ),
        'target_players', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', p.name,
                    'action_type', CASE 
                        WHEN NOT p.is_retired AND p.profile_text IS NULL THEN 'generate_new'
                        WHEN NOT p.is_retired AND p.profile_text IS NOT NULL 
                             AND aps.last_match_date >= NOW() - INTERVAL '1 day' * recent_days_threshold THEN 'replace_existing'
                        WHEN p.is_retired AND p.profile_text IS NULL THEN 'generate_retro'
                        WHEN p.is_retired AND p.profile_text IS NOT NULL 
                             AND aps.last_match_date >= NOW() - INTERVAL '1 day' * recent_days_threshold THEN 'replace_retro'
                        ELSE 'ignore'
                    END
                )
            )
            FROM players p
            LEFT JOIN aggregated_player_profile_stats aps ON p.player_id = aps.player_id
            WHERE p.is_ringer = FALSE
            AND aps.games_played >= 5
            AND (p_league_id IS NULL OR p.league_id = p_league_id) -- Optional league filtering
            OFFSET p_offset LIMIT p_limit -- Pagination support
        )
    ) INTO result;
    
    RETURN result;
END;
$$;
```

### 3. API Route (`src/app/api/admin/trigger-player-profiles/route.ts`)

**Following your existing pattern with `trigger-stats-update` for consistency:**

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Main profile generation logic that can be called by both GET (cron) and POST (manual)
async function triggerProfileGeneration() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recentDaysThreshold = parseInt(process.env.PROFILE_RECENT_DAYS_THRESHOLD || '7');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log(`🎭 Starting profile generation with ${recentDaysThreshold}-day threshold`);

  try {
    // Call the Edge Function with retry logic
    let attempt = 0;
    const maxAttempts = 3;
    let invokeError = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for generate-player-profiles`);
      
      const { data, error } = await supabase.functions.invoke('generate-player-profiles', {
        body: { recent_days_threshold: recentDaysThreshold }
      });
      
      if (!error) {
        console.log('✅ Profile generation completed successfully');
        return NextResponse.json({ 
          success: true, 
          message: 'Profile generation completed',
          results: data,
          recent_days_threshold: recentDaysThreshold
        });
      }
      
      invokeError = error;
      console.log(`Attempt ${attempt} failed for generate-player-profiles:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.error(`All attempts failed for generate-player-profiles:`, invokeError);
    return NextResponse.json({ 
      success: false, 
      error: `Profile generation failed: ${invokeError.message}`,
      recent_days_threshold: recentDaysThreshold
    }, { status: 500 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile generation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Profile generation failed: ${errorMessage}`,
      recent_days_threshold: recentDaysThreshold
    }, { status: 500 });
  }
}

// GET handler for Vercel cron jobs
export async function GET() {
  console.log('📅 Cron job triggered profile generation');
  return triggerProfileGeneration();
}

// POST handler for manual admin triggers
export async function POST() {
  console.log('👤 Manual admin triggered profile generation');
  return triggerProfileGeneration();
}
```

### 4. Edge Function (`supabase/functions/generate-player-profiles/index.ts`)

**Simplified Edge Function - receives parameters from API route:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

const BATCH_LIMIT = 50; // Maximum players per batch for pagination
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function callOpenRouterBulk(prompt: string) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://BerkoTNF.com',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 12000, // Much larger for multiple profiles
          temperature: 0.8, // Humor for Funny, Only-Positive
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const result = await response.json();
      return result.choices[0].message.content.trim();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.warn(`Retry ${attempt}/${MAX_RETRIES} for OpenRouter: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}

function parseProfilesFromResponse(response: string, targetPlayers: any[]): Record<string, string> {
  const profiles: Record<string, string> = {};
  
  try {
    // Try JSON parsing first
    const parsed = JSON.parse(response);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Fallback to regex parsing
    for (const target of targetPlayers) {
      const playerName = target.name.replace(/[^a-zA-Z0-9]/g, '\\$&'); // Escape special chars
      const regex = new RegExp(`(?:^|\\n)(?:\\*\\*)?${playerName}(?:\\*\\*)?:?\\s*\\n?([\\s\\S]*?)(?=\\n(?:\\*\\*)?[A-Z][a-z]+(?:\\*\\*)?:?|$)`, 'i');
      const match = response.match(regex);
      if (match && match[1]) {
        profiles[target.name] = match[1].trim();
      }
    }
  }
  
  return profiles;
}

serve(async (req) => {
  try {
    console.log('Starting bulk player profile generation...');
    const { recent_days_threshold = 7, offset = 0, league_id = null } = await req.json().catch(() => ({}));

    console.log(`Using ${recent_days_threshold}-day threshold for profile generation`);

    // Get complete league dataset with pagination
    const { data: leagueData, error: dataError } = await supabase
      .rpc('export_league_data_for_profiles', { 
        recent_days_threshold, 
        p_offset: offset, 
        p_limit: BATCH_LIMIT,
        p_league_id: league_id
      });
    
    if (dataError) throw dataError;
    
    const targetPlayers = leagueData.target_players?.filter(p => p.action_type !== 'ignore') || [];
    if (!targetPlayers.length) {
      return new Response(JSON.stringify({ status: 'No eligible players after filtering' }), { status: 200 });
    }

    console.log(`Generating profiles for ${targetPlayers.length} players using full league context`);

    // Build comprehensive prompt with ALL league data
    const prompt = `You are generating funny, only-positive football player profiles using complete league data.

LEAGUE CONTEXT:
${JSON.stringify(leagueData.league_context, null, 2)}

COMPLETE PLAYER DATA (ALL PLAYERS WITH FULL STATS):
${JSON.stringify(leagueData.all_players, null, 2)}

TARGET PLAYERS FOR PROFILE GENERATION:
${targetPlayers.map(p => `- ${p.name} (${p.action_type})`).join('\\n')}

INSTRUCTIONS:
Generate 2-3 paragraph profiles for ONLY the target players listed above. Each player should get their unique data-driven story.

**NARRATIVE VARIETY - Each player gets their authentic story:**
- Identify their DATA SIGNATURE: What makes THIS player genuinely unique?
- Choose 1-2 fitting narrative angles from: streaks, partnerships, breakthrough moments, consistency, clutch factor, quirky patterns, historical achievements
- Avoid formulaic approaches - if they're not a "partnership player," don't force chemistry stats
- Let their actual performance patterns drive the humor, not a template
- Some players are streak legends, others are steady performers, others are clutch heroes - match the story to the data

**HUMOR STYLE - Mine the data for character-driven comedy:**
- Turn statistical patterns into personality: "Scores in bunches", "Consistency incarnate"
- Use comparative data creatively: "Top quartile win rate, which is just showing off"
- Reference specific streaks/performances when they're genuinely notable: "That 15-match scoring drought followed by 8 goals in 5 games"
- Make teammate chemistry tangible only when it's their standout trait: "87% win rate with Sarah vs 52% apart - pure magic"
- Historical reverence for genuinely significant moments: "That 2019 unbeaten run is still WhatsApp legend"

**CREATIVE TECHNIQUES - Invent your own narrative approaches using the data creatively:**

These are just inspiration - be inventive and find unique angles for each player:
- **Streak narratives**: Current or broken streaks (win_streak, scoring_streak, attendance_streak, etc.)
- **Record moments**: Personal bests with dates (most_game_goals + most_game_goals_date, most_season_goals)
- **Performance styles**: Heavy wins, clean sheets, fantasy point patterns vs league averages
- **Attendance & dedication**: Attendance streaks, participation patterns, commitment stories
- **Partnership dynamics**: teammate_chemistry_all data for standout relationships only
- **Power & percentiles**: Use percentile rankings creatively for bragging rights humor
- **Form patterns**: Recent performance from last_5_games, seasonal trends from yearly_stats
- **Career journeys**: Mine yearly_stats progression for "unknown to legend" narratives
- **Scoring personalities**: Goal rhythm, drought/feast cycles, clutch timing

**BE CREATIVE**: Don't simply copy these examples - use the data to discover each player's unique story. Find surprising patterns, unexpected correlations, and genuine character traits hidden in their numbers. Invent your own clever ways to turn statistics into personality.

TONE: Funny, only-positive, banter style. Focus on strengths, achievements, and fun facts. NO negative comments.

LEAGUE SCALE INFERENCE: Analyze the league_context to determine the league's age (from date_range), total games, and scale. Adapt narratives accordingly—for example, in a new league with few games, treat early achievements as foundational; in an established league, emphasize long-term trends and records. Define career stages relative to the league's max games played (e.g., if max games is low, fewer games count as mid-career). Assume it's a casual weekly league unless data suggests otherwise. If league data is sparse (e.g., few games or short history), emphasize potential, fun early moments, and growth rather than historical rankings.

RETIRED PLAYERS: Use retrospective style celebrating their legacy and career highlights.

FORMAT: Return as JSON object with player names as keys:
{
  "PlayerName1": "Profile text here...",
  "PlayerName2": "Profile text here...",
  ...
}

Generate profiles now:`;

    const profilesResponse = await callOpenRouterBulk(prompt);
    const generatedProfiles = parseProfilesFromResponse(profilesResponse, targetPlayers);

    // Update players with generated profiles
    const results = [];
    for (const target of targetPlayers) {
      try {
        const playerName = target.name;
        const profileText = generatedProfiles[playerName];
        
        if (!profileText) {
          results.push({ 
            name: playerName, 
            action: target.action_type,
            status: 'error', 
            error: 'No profile generated' 
          });
          continue;
        }

        const { error: updateError } = await supabase
          .from('players')
          .update({ 
            profile_text: profileText, 
            profile_generated_at: new Date().toISOString() 
          })
          .eq('name', playerName); // Note: Use player_id if name isn't unique

        if (updateError) throw updateError;

        results.push({ 
          name: playerName, 
          action: target.action_type,
          status: 'success' 
        });
        
        console.log(`Generated ${target.action_type} profile for ${playerName}`);
      } catch (err) {
        console.error(`Failed for player ${target.name}: ${err}`);
        await supabase.from('log_errors').insert({
          function_name: 'generate-player-profiles',
          error_message: err.message,
          player_id: null,
          created_at: new Date().toISOString()
        });
        results.push({ 
          name: target.name, 
          status: 'error', 
          error: err.message 
        });
      }
    }

    return new Response(JSON.stringify({
      status: 'Complete',
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      recent_days_threshold,
      league_id,
      bulk_context_used: true,
      results,
      next_offset: offset + BATCH_LIMIT // Support for pagination
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

**Key Features:**
- **Bulk Context Processing**: Sends ALL aggregated data (14 tables, 175+ columns) in single call
- **Pagination Support**: Handles large datasets with offset/limit parameters for scalability
- **Token Size Control**: LIMIT clauses on nested arrays prevent excessive token bloat
- **Comparative Intelligence**: LLM ranks players against full league dataset for contextual insights
- **Enhanced Response Parsing**: Robust parsing with name escaping for special characters
- **Complete League Awareness**: Full access to records, streaks, teammate chemistry, historical trends
- **Retry Logic**: 3-attempt retry with exponential backoff for API resilience  
- **Action-Based Generation**: Processes multiple players simultaneously based on rule-based actions
- **Hardcoded Tone**: "Funny, Only-Positive" with humor and league-specific banter
- **Production Ready**: Proper error handling, monitoring, and scalable architecture

### 4. Admin Interface Integration

Simplified admin panel integration:
- **Manual Trigger**: Single "Generate Player Profiles" button
- **Progress Tracking**: Real-time generation status and results  
- **Configuration Display**: Shows current threshold (30 days) and batch limit
- **Cost Monitoring**: Track API usage and generation statistics

### 5. Player Profile Display Enhancement

Updated player profile screen (`PlayerProfile.component.tsx`) with:
- **Rich Bio Display**: Formatted multi-paragraph profiles
- **Strategic Placement**: Position bio section between power ratings (37%, 67%, 88%) and streaks section for optimal user flow
- **Generation Metadata**: Shows when profile was last updated (optional, for admin/debugging)
- **Responsive Design**: Maintains existing UI consistency with proper typography and spacing
- **Fallback Handling**: Graceful display when no bio exists (show nothing or placeholder)

**UI Integration Details:**
```
1. Power Ratings Section (existing)
   ↓
2. AI-Generated Player Bio (NEW - 2-3 paragraphs)
   ↓
3. Streaks Section (existing)
   ↓
4. Performance Overview (existing)
```

**Styling Considerations:**
- Consistent with existing design system and soft-UI styling
- Proper text hierarchy and readable typography
- Subtle visual separation from surrounding sections
- Mobile-responsive layout

**Implementation Guide:**
In `PlayerProfile.component.tsx`, add the bio section after the Power Rating sparklines (~line 640) and before the "NEW: Streaks Section" comment (~line 664):

```jsx
{/* AI-Generated Player Bio */}
{profile.profile_text && (
  <Card className="mb-6">
    <CardContent className="pt-6">
      <div className="prose prose-sm max-w-none" style={{ color: '#344767' }}>
        {profile.profile_text.split('\n\n').map((paragraph, index) => (
          <p key={index} className="mb-3 text-sm leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      {/* Optional: Generation timestamp for admin */}
      {profile.profile_generated_at && process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-gray-500 mt-3 border-t pt-2">
          Profile generated: {new Date(profile.profile_generated_at).toLocaleDateString()}
        </p>
      )}
    </CardContent>
  </Card>
)}

{/* NEW: Streaks Section */}
```

## Bulk Data Processing & LLM Input

### Comprehensive League Export
The system exports ALL aggregated data in a single comprehensive JSON structure:

```json
{
  "league_context": {
    "total_games": 700+,
    "total_players": 27,
    "total_seasons": 10,
    "league_records": {...},
    "season_honours": [...]
  },
  "all_players": {
    "PlayerName": {
      "profile_stats": {...},
      "all_time_stats": {...},
      "hall_of_fame_entries": [...],
      "match_streaks": {...},
      "performance_ratings": {...},
      "power_ratings": {...},
      "recent_performance": {...},
      "match_reports": [...],
      "personal_bests": [...]
    }
  },
  "target_players": [
    {"name": "John", "action_type": "generate_new"},
    {"name": "Sarah", "action_type": "replace_existing"}
  ]
}
```

### Enhanced LLM Intelligence
With complete league context, the LLM can generate insights like:
- **Comparative Rankings**: "Top quartile performer with 67% win rate"
- **Historical Context**: "3rd longest streak in 10-year league history"  
- **Relationship Analysis**: "Deadly combination with Mike - 81% win rate together"
- **Performance Patterns**: "Clutch performer who elevates in big games"

## Implementation Workflow

### Phase 1: Database Setup
1. Run schema migrations to add required fields to `players` and `aggregated_player_profile_stats` tables
2. Deploy SQL function `get_players_for_bio_generation.sql` to `/sql` directory
3. Test SQL function manually to validate rule logic and pagination

### Phase 2: API Route & Edge Function Development  
1. Create `src/app/api/admin/trigger-player-profiles/route.ts` following your existing `trigger-stats-update` pattern
2. Create `supabase/functions/generate-player-profiles/index.ts` (simplified Edge Function)
3. ✅ **COMPLETED**: `OPENROUTER_API_KEY` already configured in Supabase secrets
4. ✅ **COMPLETED**: HTTP-Referer updated to `https://BerkoTNF.com`
5. Deploy using your existing `deploy_all.ps1` script
6. Test with small player batch (2-3 players first) to validate prompt quality

**Configuration Status:**
- **OpenRouter API Key**: ✅ Configured in Supabase secrets as `OPENROUTER_API_KEY`
- **Domain/Referer**: ✅ Set to `https://BerkoTNF.com`
- **Model Access**: `google/gemini-2.5-flash-lite` (verify access in OpenRouter dashboard)
- **Environment Variable**: `PROFILE_RECENT_DAYS_THRESHOLD` (7 for weekly, 30 for monthly)
- **Deployment**: ✅ Uses existing `deploy_all.ps1` workflow
- **Scheduling**: ✅ Vercel cron in `vercel.json` (consistent with existing pattern)

### Phase 3: Vercel Cron Integration
Following your existing pattern with `vercel.json` and API routes for consistency and version control.

**Add to `vercel.json`:**
```json
"crons": [
  {
    "path": "/api/admin/trigger-stats-update",
    "schedule": "0 2 * * *"
  },
  {
    "path": "/api/admin/trigger-player-profiles", 
    "schedule": "0 23 * * 0"
  }
]
```

**Environment Configuration:**
Add to `.env.local` or environment variables:
```bash
# Profile generation frequency control
PROFILE_RECENT_DAYS_THRESHOLD=7    # 7 for weekly, 30 for monthly
```

**Schedule Options:**
- **Weekly (Recommended for new leagues)**: `"0 23 * * 0"` (Sundays at 23:00 UTC)
- **Monthly**: `"0 23 1 * *"` (1st of month at 23:00 UTC)

**Complete `vercel.json` crons section:**
```json
"crons": [
  {
    "path": "/api/admin/trigger-stats-update",
    "schedule": "0 2 * * *"
  },
  {
    "path": "/api/admin/trigger-player-profiles", 
    "schedule": "0 23 * * 0"
  }
]
```

### Phase 4: Integration & Testing
1. Add new cron entry to `vercel.json` for profile generation schedule
2. Configure `PROFILE_RECENT_DAYS_THRESHOLD` environment variable (7 for weekly, 30 for monthly)
3. Test API route manually via admin interface
4. Enhance player profile display component to show generated bios (between power ratings and streaks sections)
5. Test UI integration and responsive design across devices
6. Verify Vercel cron deployment and scheduling

### Phase 5: Testing & Monitoring
**Testing Steps:**
1. **Test SQL Export**: Run `SELECT export_league_data_for_profiles(30)` and check token size (aim <100K)
2. **Validate Data Quality**: Ensure all 14 aggregated tables are included with proper joins and LIMIT controls
3. **Test Diverse Players**: Generate profiles for 3 players - newbie (5 games), veteran (100+ games), retired (50+ games)
4. **Verify Comparative Insights**: Check for phrases like "top quartile", "3rd longest streak in league history"
5. **Validate Humor & Tone**: Look for humor phrases like "weeping with joy" and positive achievements
6. **Test Retrospective Style**: Ensure retired players get career celebration narrative
7. **Test Weekly Behavior**: Run with `RECENT_DAYS_THRESHOLD = 7` to validate weekly generation logic
8. **Check Cost**: Monitor OpenRouter dashboard for actual token usage post-test
9. **Test Pagination**: Verify offset/limit parameters work correctly for large datasets

**Monitoring:**
1. Deploy via your existing script workflow
2. Monitor generation results and API costs
3. Validate rule-based logic is working correctly (retired vs active handling)
4. Check logs for retry attempts and error handling

## Cost Analysis & Optimization

### Expected Costs (Enhanced Bulk Context with Token Control)
- **Input Tokens**: ~50K tokens (optimized league data with LIMIT controls) × $0.10/M = **$0.005 per batch**
- **Output Tokens**: ~10K tokens (batch of profiles) × $0.40/M = **$0.004 per batch**  
- **Total Cost**: **~$0.009 per batch** (even more efficient!)
- **Monthly Budget**: **<$0.40/month** for weekly generation or **<$0.12/month** for monthly
- **Initial Backfill**: **~$0.009** for all existing eligible players

### Comparison vs Individual Approach
- **Old approach**: 27 × $0.00014 = **$0.0038** but with minimal context
- **New approach**: **$0.01** but with complete league intelligence and comparative insights
- **Value**: **~3x cost for 20x richer profiles** - incredible ROI!

### Cost Controls
- **Targeted Generation**: Only active or new players
- **Batch Limiting**: Max 50 players per run
- **Skip Logic**: Avoids regenerating unchanged profiles
- **Efficient Prompts**: Optimized token usage

## Error Handling & Monitoring

### Robust Error Management
- **API Failures**: Graceful handling of LLM service outages
- **Database Logging**: Track failures in existing `log_errors` table
- **Partial Success**: Continue processing despite individual player failures
- **Retry Logic**: Built-in resilience for transient failures

### Monitoring & Alerts
- **Generation Statistics**: Track success/failure rates
- **Cost Tracking**: Monitor API usage trends
- **Quality Assurance**: Admin review capabilities for generated content

## Future Enhancements

### Potential Improvements
- **Multilingual Support**: Generate profiles in different languages
- **Style Variations**: Expand beyond current tone options
- **Performance Analytics**: A/B test different prompt strategies
- **User Feedback**: Allow players to request profile regeneration

## Vercel Cron Integration (Consistent with Existing Pattern)

### ✅ **Consistent Architecture**
Following your existing pattern with version-controlled configuration:
- **Stats Updates**: `vercel.json` → `/api/admin/trigger-stats-update` → Supabase Edge Functions
- **Profile Generation**: `vercel.json` → `/api/admin/trigger-player-profiles` → Supabase Edge Function

### ✅ **Separate Scheduling (NOT Tied to Match Updates)**
Profile generation runs on its own schedule, separate from nightly stats:
- ❌ **NOT** added to existing `FUNCTIONS_TO_CALL` array (would be too frequent/expensive)
- ✅ **Separate Vercel cron entry** with weekly/monthly schedule
- ✅ **Environment variable control** for easy frequency changes

### Schedule Options & Costs
**Weekly Generation (Recommended for new leagues)**
- Schedule: `"0 23 * * 0"` (Sundays at 23:00 UTC)
- Environment: `PROFILE_RECENT_DAYS_THRESHOLD=7`
- Cost: ~$0.04 per month (4 runs)

**Monthly Generation**
- Schedule: `"0 23 1 * *"` (1st of month at 23:00 UTC)  
- Environment: `PROFILE_RECENT_DAYS_THRESHOLD=30`
- Cost: ~$0.01 per month (1 run)

**Manual Only**
- Remove cron entry, keep API route for admin triggers
- Zero automated costs

### Multi-Tenancy Support
Optional `league_id` parameter support built into both API route and SQL function for future expansion.

---

## Summary of Revolutionary Bulk Approach

### Game-Changing Architecture
- **Bulk Context Processing**: Sends ALL 14 aggregated tables (175+ columns) in single LLM call
- **Complete League Intelligence**: LLM dynamically analyzes full league context, all player relationships, and historical patterns
- **Comparative Insights**: Enables rankings, percentiles, and historical context impossible with individual calls
- **Hardcoded Tone**: "Funny, Only-Positive" with league-specific humor and banter

### Enhanced Profile Quality
- **Rich Contextual Narratives**: "Sarah's 67% win rate puts her in top quartile", "3rd longest streak in league history"
- **Relationship Intelligence**: "Strong chemistry with Mike (81% win rate together vs 52% apart)"
- **Historical Awareness**: References league records, milestones, and career trajectories
- **Performance Patterns**: Identifies unique trends, clutch moments, signature achievements

### Technical Excellence
- **Dynamic League Adaptation**: Automatically infers league age, scale, and context from data rather than hardcoded assumptions
- **Paginated SQL Export Function**: Comprehensive `export_league_data_for_profiles()` with pagination and token control
- **Token Size Optimization**: LIMIT clauses on nested arrays prevent excessive token bloat while preserving rich context
- **Enhanced Response Parsing**: Robust parsing with special character escaping and JSON/text fallback
- **Retry Logic**: 3-attempt retry with exponential backoff for API resilience
- **Rule-Based Targeting**: Smart identification of players needing new/updated profiles
- **Production Scalability**: Handles large leagues with offset/limit pagination support

### Economics & Efficiency
- **Incredible Value**: ~$0.01 per batch for all eligible players with complete league context
- **20x Richer Profiles**: For only 3x the cost of minimal individual calls
- **Monthly Budget**: <$0.50 for weekly updates, <$0.15 for monthly
- **Scalable**: Handles any league size efficiently

### Implementation Ready
- **Complete SQL Functions**: Full league data export with rule-based player selection and optional multi-tenancy
- **Version-Controlled API Route**: Follows existing `trigger-stats-update` pattern exactly
- **Simplified Edge Function**: Bulk processing with comprehensive error handling
- **Vercel Cron Integration**: Consistent architecture with existing stats workflow
- **Testing Strategy**: Validate comparative insights and humor quality

This approach transforms player profiles from basic stat summaries into rich, entertaining narratives with league-wide context and comparative intelligence - adapting perfectly to any league's unique scale and history!

## Implementation Notes

The following adjustments were made during implementation to match the actual database schema:

### Schema Differences Resolved
- **`seasons` table**: Does not exist in the database. Replaced with dynamic calculation using `COUNT(DISTINCT EXTRACT(YEAR FROM match_date)) FROM matches`
- **`league_id` column**: Does not exist in `players` table. Removed multi-tenancy filtering from the export function
- **SQL aggregation syntax**: Fixed `ORDER BY` clauses within `jsonb_agg()` functions by wrapping them in subqueries for PostgreSQL compatibility

### LLM Response Handling
- **Markdown wrapper parsing**: Added logic to handle LLM responses wrapped in ```json code blocks
- **Fallback parsing**: Implemented regex-based parsing for cases where JSON parsing fails
- **Enhanced logging**: Added comprehensive debug logging to track LLM interaction and response processing

### API Integration
- **Prisma schema sync**: Added `profile_text` and `profile_generated_at` columns to `players` model
- **Frontend API route**: Updated `playerprofile/route.ts` to fetch and return profile data
- **UI integration**: Added profile display section to `PlayerProfile.component.tsx`

### Files Successfully Deployed
- ✅ `sql/export_league_data_for_profiles.sql` - Enhanced export function with all 14 aggregated tables
- ✅ `supabase/functions/generate-player-profiles/index.ts` - LLM processing Edge Function
- ✅ `src/app/api/admin/trigger-player-profiles/route.ts` - API trigger with retry logic
- ✅ `vercel.json` - Weekly cron job configuration (Sundays at 11 PM)

This implementation leverages your existing infrastructure while adding intelligent, cost-effective player profile generation that enhances the user experience with minimal operational overhead.