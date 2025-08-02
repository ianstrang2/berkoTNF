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
          max_tokens: 15000, // Individual prompts are much smaller, can use higher limit
          temperature: 0.9, // Increased creativity and humor for light-hearted banter
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
      
      // Fix: Check if each profile value is a JSON string that needs unwrapping
      const cleanedProfiles: Record<string, string> = {};
      for (const [playerName, profileValue] of Object.entries(parsed)) {
        if (typeof profileValue === 'string') {
          try {
            // Check if the profile value is a JSON string
            const profileJson = JSON.parse(profileValue);
            if (profileJson && typeof profileJson === 'object' && profileJson.profile) {
              // Extract the profile text from {"profile": "..."}
              cleanedProfiles[playerName] = profileJson.profile;
              console.log(`🔧 Unwrapped JSON for ${playerName}`);
            } else {
              // It's already plain text
              cleanedProfiles[playerName] = profileValue;
            }
          } catch {
            // It's already plain text, not JSON
            cleanedProfiles[playerName] = profileValue;
          }
        } else {
          // Not a string, keep as is
          cleanedProfiles[playerName] = String(profileValue);
        }
      }
      
      return cleanedProfiles;
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
    console.log('Starting individual player profile generation...');
    const { recent_days_threshold = 7, offset = 0, limit = 20 } = await req.json().catch(() => ({}));

    console.log(`Using ${recent_days_threshold}-day threshold for profile generation`);

    // First, get list of target players who need profiles
    const { data: targetPlayersData, error: playersError } = await supabase
      .rpc('export_league_data_for_profiles', { 
        recent_days_threshold, 
        p_offset: offset, 
        p_limit: limit
      });
    
    if (playersError) throw playersError;
    
    const targetPlayers = targetPlayersData.target_players?.filter(p => p.action_type !== 'ignore') || [];
    if (!targetPlayers.length) {
      return new Response(JSON.stringify({ status: 'No eligible players after filtering' }), { status: 200 });
    }

    console.log(`Processing ${targetPlayers.length} players individually with rich context`);

    const results = [];
    
    // Process each player individually
    for (const targetPlayer of targetPlayers) {
      try {
        console.log(`🎭 Generating profile for ${targetPlayer.name}...`);
        
        // Get individual player data with league context
        const { data: playerData, error: dataError } = await supabase
          .rpc('export_individual_player_for_profile', { 
            target_player_id: targetPlayer.player_id,
            recent_days_threshold 
          });
        
        if (dataError) {
          console.error(`Failed to get data for ${targetPlayer.name}:`, dataError);
          results.push({ 
            name: targetPlayer.name, 
            action: targetPlayer.action_type,
            status: 'error', 
            error: `Data fetch failed: ${dataError.message}` 
          });
          continue;
        }

        // Build optimized prompt for individual player
        const prompt = `You are generating a funny football player profile using league context and detailed individual data.

LEAGUE CONTEXT (FOR COMPARATIVE INSIGHTS):
${JSON.stringify(playerData.league_context, null, 2)}

TARGET PLAYER DATA (FULL DETAILS):
${JSON.stringify(playerData.target_player, null, 2)}

**IMPORTANT DATA CLARIFICATIONS:**
- **selected_club**: This is the player's FAVORITE/SUPPORTED professional club (e.g., Tottenham, Arsenal) - NOT the team they play for
- **League Context**: This is a casual local football league where all players play together regardless of which professional clubs they support
- **DO NOT**: Say the player "plays for" their selected_club - they only SUPPORT that club
- **DO**: You can mention their club allegiance for banter (e.g., "Despite being a Spurs fan, he's surprisingly reliable")

INSTRUCTIONS:
Generate a profile for ${playerData.target_player.basic_info.name}. Use the league context for comparative insights and rankings.

**CRITICAL: DYNAMIC PROFILE LENGTH - STRICTLY follow these match-based rules:**

FIRST: Check games_played from profile_stats data.

IF games_played < 25: 
- Length = 50-100 words MAXIMUM
- Focus on potential and early moments

IF games_played >= 25 AND games_played < 50:
- Length = 125-225 words
- Include early career development

IF games_played >= 50 AND games_played < 100:
- Length = 125-225 words
- Include early career development

IF games_played >= 100 AND games_played < 150:
- Length = 200-300 words  
- Include career development patterns

IF games_played >= 150 AND games_played < 200:
- Length = 275-375 words
- Include detailed career progression

IF games_played >= 200:
- Length = 350-450 words
- Comprehensive career retrospective

EXAMPLES: 
- If games_played = 12, write 50-100 words ONLY
- If games_played = 75, write 125-225 words  
- If games_played = 175, write 275-375 words
- If games_played = 250, write 350-450 words

**ENHANCED CAREER RETROSPECTIVE - For veterans especially:**
- Create a narrative arc: early days → mid-career peaks → recent form → overall legacy
- Use yearly_stats progression to show evolution over time (improvement from early years, peak seasons, consistency patterns)
- Reference career highs and lows with humor: peak goal-scoring seasons, memorable droughts broken by hat-tricks, power_ratings trends over time
- Include milestone moments from match_streaks, season_stats, and personal_bests with dates
- For long-time players, discuss season-by-season progression and how their stats have trended (win rate over time, goal patterns, consistency evolution)
- Frame career lows (slumps, droughts, tough periods) humorously and positively: "bounced back from that goal drought like a champ", "survived the great slump of 2019 to emerge stronger"

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
- Frame lows humorously but positively: turn droughts into comeback stories, slumps into character-building moments

**LEAGUE CONTEXT USAGE:**
- Use league records to contextualize achievements: "Approaching the league record of X"
- Reference percentile rankings for bragging rights: "87th percentile goal threat"
- Compare to season honours for elite status: "Joining the exclusive group of season winners"
- Use league age and scale to frame career stages appropriately

**TONE:** Funny with light-hearted banter. Allow honest mentions of lows (slumps, droughts, tough periods) but frame them humorously and positively overall. Keep the tone fun, engaging, and league-specific without being harsh or negative.

**RETIRED PLAYERS:** Use retrospective style celebrating their legacy and career highlights with comprehensive career review.

**FORMAT:** Return just the profile text (no JSON wrapper needed for individual processing):

**FINAL REMINDER: STRICTLY ENFORCE WORD LIMITS BASED ON GAMES PLAYED**
- If games_played < 25: Write 50-100 words MAXIMUM
- If games_played 25-49: Write 125-225 words
- If games_played 50-99: Write 125-225 words  
- If games_played 100-149: Write 200-300 words
- If games_played 150-199: Write 275-375 words
- If games_played 200+: Write 350-450 words

Generate profile now:`;

        // Validate prompt size
        console.log(`📏 Prompt length: ${prompt.length} characters`);

        const profileText = await callOpenRouterBulk(prompt);
        
        // Clean the response (remove any JSON wrappers or markdown)
        let cleanedProfile = profileText.trim();
        if (cleanedProfile.startsWith('```') && cleanedProfile.endsWith('```')) {
          cleanedProfile = cleanedProfile.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
        }
        if (cleanedProfile.startsWith('"') && cleanedProfile.endsWith('"')) {
          cleanedProfile = cleanedProfile.slice(1, -1);
        }

        // Update player in database
        const { error: updateError } = await supabase
          .from('players')
          .update({ 
            profile_text: cleanedProfile, 
            profile_generated_at: new Date().toISOString() 
          })
          .eq('player_id', targetPlayer.player_id);

        if (updateError) throw updateError;

        results.push({ 
          name: targetPlayer.name, 
          action: targetPlayer.action_type,
          status: 'success',
          profile_length: cleanedProfile.length
        });
        
        console.log(`✅ Generated ${targetPlayer.action_type} profile for ${targetPlayer.name} (${cleanedProfile.length} chars)`);
        
      } catch (err) {
        console.error(`❌ Failed for player ${targetPlayer.name}: ${err}`);
        await supabase.from('log_errors').insert({
          function_name: 'generate-player-profiles',
          error_message: err.message,
          player_id: targetPlayer.player_id,
          created_at: new Date().toISOString()
        });
        results.push({ 
          name: targetPlayer.name, 
          action: targetPlayer.action_type,
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
      individual_processing: true,
      results,
      next_offset: offset + limit // Support for pagination
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