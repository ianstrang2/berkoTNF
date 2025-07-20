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

    // Fetch current trend-adjusted metrics from power ratings (2-metric system)
    const { data: powerRatings, error: powerError } = await supabase
      .from('aggregated_player_power_ratings')
      .select('trend_rating,trend_goal_threat,league_avg_goal_threat')
      .eq('player_id', playerId)
      .single();

    if (powerError) {
      console.error('Error fetching power ratings:', powerError);
      return NextResponse.json(
        { success: false, error: 'No trend data available - player may be retired or inactive' },
        { status: 404 }
      );
    }

    // Fetch league distribution data for percentile calculations (2-metric system)
    const { data: leagueStats, error: leagueError } = await supabase
      .from('aggregated_player_power_ratings')
      .select('trend_rating,trend_goal_threat,effective_games')
      .not('trend_rating', 'is', null);

    let leagueDistribution = {
      power_rating: { p10: 3.0, p90: 8.0, avg: 5.35 },
      goal_threat: { p10: 0.2, p90: 1.0, avg: 0.5 },
      participation: { p10: 30, p90: 95, avg: 75 }
    };

    if (!leagueError && leagueStats && leagueStats.length > 0) {
      const ratings = leagueStats.map(s => s.trend_rating || 0).filter(r => r > 0);
      const goalThreats = leagueStats.map(s => s.trend_goal_threat || 0);

      if (ratings.length > 0) {
        ratings.sort((a, b) => a - b);
        const p10Index = Math.floor(ratings.length * 0.1);
        const p90Index = Math.floor(ratings.length * 0.9);
        
        leagueDistribution.power_rating = {
          p10: ratings[p10Index],
          p90: ratings[p90Index],
          avg: ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        };
      }

      if (goalThreats.length > 0) {
        goalThreats.sort((a, b) => a - b);
        const p10Index = Math.floor(goalThreats.length * 0.1);
        const p90Index = Math.floor(goalThreats.length * 0.9);
        
        leagueDistribution.goal_threat = {
          p10: goalThreats[p10Index],
          p90: goalThreats[p90Index],
          avg: goalThreats.reduce((sum, gt) => sum + gt, 0) / goalThreats.length
        };
      }
    }

    // Minimum games for qualified scaling
    const MIN_GAMES_FOR_SCALE = 15;
    
    // Get qualified players only (15+ games)
    const qualifiedStats = leagueStats?.filter(s => {
      const effectiveGames = s.effective_games || 0;
      return effectiveGames >= MIN_GAMES_FOR_SCALE;
    }) || [];

    const leagueMaximums = qualifiedStats.length > 0 && leagueStats ? {
      power_rating: Math.max(...qualifiedStats.map(s => s.trend_rating || 0)),
      goal_threat: Math.max(...qualifiedStats.map(s => s.trend_goal_threat || 0)),
      participation: 100 // Participation is naturally 0-100%
    } : { 
      power_rating: 15, 
      goal_threat: 1.0, 
      participation: 100 
    }; // Fallback values

    // Process historical blocks for sparkline data
    const historicalBlocks = trendData?.historical_blocks || [];
    const sparklineData: Array<{
      period: string;
      start_date: string;
      end_date: string;
      power_rating: number;
      goal_threat: number;
      participation: number;
      power_rating_percentile: number;
      goal_threat_percentile: number;
      participation_percentile: number;
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
      const gamesPossible = Number(block.games_possible) || gamesPlayed;
      
      // Calculate raw metrics
      const powerRating = fantasyPoints / Math.max(gamesPlayed, 1);
      const goalThreat = Math.min(1.5, goals / Math.max(gamesPlayed, 1));
      const participation = (gamesPlayed / Math.max(gamesPossible, 1)) * 100;

      // Calculate absolute percentages for sparkline data (based on qualified maximums, capped at 100%)
      const powerRatingPercentile = leagueMaximums.power_rating > 0 ? 
        Math.min(100, Math.round((powerRating / leagueMaximums.power_rating) * 100)) : 0;

      const goalThreatPercentile = leagueMaximums.goal_threat > 0 ? 
        Math.min(100, Math.round((goalThreat / leagueMaximums.goal_threat) * 100)) : 0;

      const participationPercentile = Math.min(100, Math.round(participation));

      // Handle date processing
      let period = 'Unknown';
      try {
        if (typeof block.start_date === 'string') {
          period = block.start_date.substring(0, 7);
        }
      } catch (e) {
        console.error('Date processing error:', e, block.start_date);
      }

      sparklineData.push({
        period,
        start_date: block.start_date,
        end_date: block.end_date,
        power_rating: Math.round(powerRating * 100) / 100,
        goal_threat: Math.round(goalThreat * 1000) / 1000,
        participation: Math.round(participation * 10) / 10,
        power_rating_percentile: powerRatingPercentile,
        goal_threat_percentile: goalThreatPercentile,
        participation_percentile: participationPercentile,
        games_played: gamesPlayed
      });
    }

    // Current metric percentiles (for display)
    const currentTrendRating = powerRatings?.trend_rating || 0;
    const currentTrendGoalThreat = powerRatings?.trend_goal_threat || 0;
    
    // Calculate current participation from most recent block
    let currentParticipation = 50; // Default
    if (sparklineData.length > 0) {
      currentParticipation = sparklineData[sparklineData.length - 1].participation;
    }

    const currentPercentiles = {
      power_rating: leagueMaximums.power_rating > 0 ? 
        Math.min(100, Math.round((currentTrendRating / leagueMaximums.power_rating) * 100)) : 0,
      goal_threat: leagueMaximums.goal_threat > 0 ? 
        Math.min(100, Math.round((currentTrendGoalThreat / leagueMaximums.goal_threat) * 100)) : 0,
      participation: Math.min(100, Math.round(currentParticipation))
    };

    console.log(`Player ${playerId} trends:`, {
      current_trend_rating: currentTrendRating,
      current_goal_threat: currentTrendGoalThreat,
      current_participation: currentParticipation,
      percentiles: currentPercentiles,
      sparkline_points: sparklineData.length
    });

    return NextResponse.json({
      success: true,
      data: {
        // Current metrics (2-metric system + participation)
        current_metrics: {
          trend_rating: currentTrendRating,
          trend_goal_threat: currentTrendGoalThreat,
          participation_percentage: currentParticipation,
          league_avg_goal_threat: powerRatings?.league_avg_goal_threat || 0
        },
        
        // Current percentiles for display
        current_percentiles: currentPercentiles,
        
        // Historical sparkline data
        sparkline_data: sparklineData,
        
        // League context for frontend calculations
        league_distribution: leagueDistribution,
        league_maximums: leagueMaximums,
        
        // Metadata
        data_quality: {
          historical_blocks_count: historicalBlocks.length,
          sparkline_points: sparklineData.length,
          qualified_players_in_league: qualifiedStats.length
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error in player trends API:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching trend data' },
      { status: 500 }
    );
  }
} 