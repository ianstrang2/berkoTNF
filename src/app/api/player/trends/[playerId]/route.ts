import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET handler for player trend data
export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[API /player/trends] Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error: Supabase credentials missing.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const playerId = parseInt(params.playerId, 10);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    // Fetch historical blocks and current trend metrics
    const { data: trendData, error: trendError } = await supabase
      .from('aggregated_half_season_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (trendError) {
      console.error('Error fetching trend data:', trendError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trend data' },
        { status: 500 }
      );
    }

    // Fetch current trend-adjusted metrics from power ratings
    // NOTE: Using SELECT * because specific field selection returns wrong values
    
    const { data: powerRatings, error: powerError } = await supabase
      .from('aggregated_player_power_ratings')
      .select('trend_rating,trend_goal_threat,defensive_score,league_avg_goal_threat,league_avg_defensive_score')
      .eq('player_id', playerId)
      .single();

    if (powerError) {
      console.error('Error fetching power ratings:', powerError);
      // Continue without power ratings - new player scenario
    }

    // Fetch league distribution data for percentile calculations
    const { data: leagueStats, error: leagueError } = await supabase
      .from('aggregated_player_power_ratings')
      .select('trend_rating,trend_goal_threat,defensive_score,effective_games')
      .not('trend_rating', 'is', null);

    let leagueDistribution = {
      power_rating: { p10: 3.0, p90: 8.0, avg: 5.35 },
      goal_threat: { p10: 0.2, p90: 1.0, avg: 0.5 },
      defensive_score: { p10: 0.5, p90: 0.95, avg: 0.7 }
    };

    if (!leagueError && leagueStats && leagueStats.length > 0) {
      // Calculate actual percentiles from league data
      const powerRatings = leagueStats.map(s => s.trend_rating).filter(r => r !== null).sort((a, b) => a - b);
      const goalThreats = leagueStats.map(s => s.trend_goal_threat).filter(g => g !== null).sort((a, b) => a - b);
      const defensiveScores = leagueStats.map(s => s.defensive_score).filter(d => d !== null).sort((a, b) => a - b);

      if (powerRatings.length > 0) {
        leagueDistribution.power_rating = {
          p10: powerRatings[Math.floor(powerRatings.length * 0.1)],
          p90: powerRatings[Math.floor(powerRatings.length * 0.9)],
          avg: powerRatings.reduce((a, b) => a + b, 0) / powerRatings.length
        };
      }

      if (goalThreats.length > 0) {
        leagueDistribution.goal_threat = {
          p10: goalThreats[Math.floor(goalThreats.length * 0.1)],
          p90: goalThreats[Math.floor(goalThreats.length * 0.9)],
          avg: goalThreats.reduce((a, b) => a + b, 0) / goalThreats.length
        };
      }

      if (defensiveScores.length > 0) {
        leagueDistribution.defensive_score = {
          p10: defensiveScores[Math.floor(defensiveScores.length * 0.1)],
          p90: defensiveScores[Math.floor(defensiveScores.length * 0.9)],
          avg: defensiveScores.reduce((a, b) => a + b, 0) / defensiveScores.length
        };
      }
    }

    // Note: Using qualified maximum scaling (players with 15+ games only) to avoid small-sample outliers
    
    // Calculate qualified maximums for robust scaling (avoids small-sample outliers)

    // Use "qualified maximum" - only players with proven sample sizes (15+ games) set the 100% benchmark
    // This prevents statistical flukes from small samples from breaking the scale for everyone
    const MIN_GAMES_FOR_SCALE = 15;
    
    // Get qualified players only (15+ games)
    const qualifiedStats = leagueStats?.filter(s => {
      const effectiveGames = s.effective_games || 0;
      return effectiveGames >= MIN_GAMES_FOR_SCALE;
    }) || [];

    const leagueMaximums = qualifiedStats.length > 0 ? {
      power_rating: Math.max(...qualifiedStats.map(s => s.trend_rating || 0)),
      goal_threat: Math.max(...qualifiedStats.map(s => s.trend_goal_threat || 0)),
      defensive_score: Math.max(...qualifiedStats.map(s => s.defensive_score || 0))
    } : { power_rating: 15, goal_threat: 1.0, defensive_score: 0.8 }; // Fallback values

    // Process historical blocks for sparkline data
    const historicalBlocks = trendData?.historical_blocks || [];
    const sparklineData: Array<{
      period: string;
      start_date: string;
      end_date: string;
      power_rating: number;
      goal_threat: number;
      defensive_score: number;
      power_rating_percentile: number;
      goal_threat_percentile: number;
      defensive_score_percentile: number;
      games_played: number;
    }> = [];

    // Get last 6 blocks maximum for sparklines
    const recentBlocks = historicalBlocks.slice(-6);

    for (const block of recentBlocks) {
      const gamesPlayed = Number(block.games_played) || 0;
      
      // Only include blocks with actual games played
      if (gamesPlayed === 0) continue;
      
      const fantasyPoints = Number(block.fantasy_points) || 0;
      const goals = Number(block.goals) || 0;
      
      // Calculate raw metrics
      const powerRating = fantasyPoints / gamesPlayed;
      const goalThreat = Math.min(1.5, goals / gamesPlayed);
      
      // Calculate defensive score using the same formula as SQL
      const goalsConceeded = Number(block.goals_conceded) || 0;
      const cleanSheets = Number(block.clean_sheets) || 0;
      const leagueAvgGc = 0.5; // Default fallback
      const defensiveScore = Math.min(0.95, Math.max(0.5,
        (1.0 / (1.0 + goalsConceeded / Math.max(leagueAvgGc, 0.1))) *
        (1.0 + cleanSheets / Math.max(gamesPlayed, 1))
      ));

      // Calculate absolute percentages for sparkline data (based on qualified maximums, capped at 100%)
      const powerRatingPercentile = leagueMaximums.power_rating > 0 ? 
        Math.min(100, Math.round((powerRating / leagueMaximums.power_rating) * 100)) : 0;

      const goalThreatPercentile = leagueMaximums.goal_threat > 0 ? 
        Math.min(100, Math.round((goalThreat / leagueMaximums.goal_threat) * 100)) : 0;

      const defensiveScorePercentile = leagueMaximums.defensive_score > 0 ? 
        Math.min(100, Math.round((defensiveScore / leagueMaximums.defensive_score) * 100)) : 0;

      // Handle date processing
      let period = 'Unknown';
      try {
        if (typeof block.start_date === 'string') {
          period = block.start_date.substring(0, 7);
        }
      } catch (e) {
        console.error('Date processing error:', e, block.start_date);
      }

      const sparklineEntry = {
        period,
        start_date: block.start_date,
        end_date: block.end_date,
        power_rating: Math.round(powerRating * 100) / 100,
        goal_threat: Math.round(goalThreat * 100) / 100,
        defensive_score: Math.round(defensiveScore * 100) / 100,
        power_rating_percentile: Math.round(powerRatingPercentile),
        goal_threat_percentile: Math.round(goalThreatPercentile),
        defensive_score_percentile: Math.round(defensiveScorePercentile),
        games_played: Math.round(gamesPlayed * 100) / 100
      };
      
      sparklineData.push(sparklineEntry);
    }

    // Calculate percentiles for current metrics
    if (powerError) {
      console.error('Error fetching power ratings:', powerError);
    }
    
    const currentMetrics = {
      power_rating: powerRatings?.trend_rating || 5.35,
      goal_threat: powerRatings?.trend_goal_threat || 0.5,
      defensive_score: powerRatings?.defensive_score || 0.7,
      league_avg_goal_threat: powerRatings?.league_avg_goal_threat || 0.5,
      league_avg_defensive_score: powerRatings?.league_avg_defensive_score || 0.7
    };



    // Calculate absolute percentages based on qualified maximums (capped at 100%)
    const powerRatingPercentile = leagueMaximums.power_rating > 0 ? 
      Math.min(100, Math.round((currentMetrics.power_rating / leagueMaximums.power_rating) * 100)) : 0;

    const goalThreatPercentile = leagueMaximums.goal_threat > 0 ? 
      Math.min(100, Math.round((currentMetrics.goal_threat / leagueMaximums.goal_threat) * 100)) : 0;

    const defensivePercentile = leagueMaximums.defensive_score > 0 ? 
      Math.min(100, Math.round((currentMetrics.defensive_score / leagueMaximums.defensive_score) * 100)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        player_id: playerId,
        current_metrics: {
          power_rating: Math.round(currentMetrics.power_rating * 100) / 100,
          goal_threat: Math.round(currentMetrics.goal_threat * 100) / 100,
          defensive_score: Math.round(currentMetrics.defensive_score * 100) / 100,
          power_rating_percentile: Math.round(powerRatingPercentile),
          goal_threat_percentile: Math.round(goalThreatPercentile),
          defensive_percentile: Math.round(defensivePercentile)
        },
        sparkline_data: sparklineData,
        league_distribution: leagueDistribution,
        blocks_count: historicalBlocks.length,
        has_trend_data: historicalBlocks.length > 0 && sparklineData.length > 0
      }
    });

  } catch (error: any) {
    console.error('Error in player trends API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 