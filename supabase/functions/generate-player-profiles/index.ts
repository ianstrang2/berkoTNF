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
  
  // Remove markdown code block wrappers if present
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  try {
    // Try JSON parsing first
    const parsed = JSON.parse(cleanResponse);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      console.log('✅ Successfully parsed JSON response');
      return parsed;
    }
  } catch (e) {
    console.log('❌ JSON parsing failed, trying regex fallback:', e.message);
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
    
    // DEBUG: Log the raw response to see what we get
    console.log('🔍 RAW LLM RESPONSE (first 1000 chars):');
    console.log(profilesResponse.substring(0, 1000));
    console.log('🔍 RAW LLM RESPONSE (last 1000 chars):');
    console.log(profilesResponse.substring(Math.max(0, profilesResponse.length - 1000)));
    
    const generatedProfiles = parseProfilesFromResponse(profilesResponse, targetPlayers);
    
    // DEBUG: Log what parsing found
    console.log('🔍 PARSED PROFILES COUNT:', Object.keys(generatedProfiles).length);
    console.log('🔍 PARSED PROFILE KEYS:', Object.keys(generatedProfiles));

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