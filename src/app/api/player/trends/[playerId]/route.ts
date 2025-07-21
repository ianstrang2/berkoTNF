import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const playerId = parseInt(params.playerId);
    
    if (isNaN(playerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Use Prisma for fresh data instead of Supabase (prevents stale data issues)
    const freshPowerRatings = await prisma.aggregated_player_power_ratings.findUnique({
      where: { player_id: playerId },
      select: {
        trend_rating: true,
        trend_goal_threat: true,
        trend_participation: true,
        league_avg_goal_threat: true,
        league_avg_participation: true,
        updated_at: true
      } as any
    });

    if (!freshPowerRatings) {
      return NextResponse.json(
        { success: false, error: 'No trend data available - player may be retired or inactive' },
        { status: 404 }
      );
    }

    // Fetch historical blocks using Prisma (like other working APIs)
    const trendData = await prisma.aggregated_half_season_stats.findUnique({
      where: { player_id: playerId },
      select: { historical_blocks: true } as any
    });

    if (!trendData) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trend data' },
        { status: 500 }
      );
    }

    // Use Prisma for league stats too - get all qualified players
    const leagueStats = await prisma.aggregated_player_power_ratings.findMany({
      where: {
        trend_rating: { not: null }
      } as any,
      select: {
        trend_rating: true,
        trend_goal_threat: true,
        effective_games: true
      } as any
    });

    let leagueDistribution = {
      power_rating: { p10: 3.0, p90: 8.0, avg: 5.35 },
      goal_threat: { p10: 0.2, p90: 1.0, avg: 0.5 },
      participation: { p10: 30, p90: 95, avg: 75 }
    };

    if (leagueStats && leagueStats.length > 0) {
      const ratings = leagueStats.map(s => (s as any).trend_rating || 0).filter(r => r > 0);
      const goalThreats = leagueStats.map(s => (s as any).trend_goal_threat || 0);

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
    
    // Get qualified players only (15+ games) and ensure we use them for scaling
    const qualifiedStats = leagueStats?.filter(s => {
      const effectiveGames = (s as any).effective_games || 0;
      return effectiveGames >= MIN_GAMES_FOR_SCALE && (s as any).trend_rating !== null;
    }) || [];

    const leagueMaximums = qualifiedStats.length > 0 ? {
      power_rating: Math.max(...qualifiedStats.map(s => (s as any).trend_rating || 0)),
      goal_threat: Math.max(...qualifiedStats.map(s => (s as any).trend_goal_threat || 0)),
      participation: 100 // Participation is naturally 0-100%
    } : { 
      // Fallback if no qualified players (shouldn't happen in practice)
      power_rating: 15, 
      goal_threat: 1.0, 
      participation: 100 
    };

    // Process historical blocks for sparkline data
    const historicalBlocks = ((trendData as any)?.historical_blocks as any[]) || [];
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
      
      // TEMPORARY FIX: Detect and correct games_possible undercount
      let participation = (gamesPlayed / Math.max(gamesPossible, 1)) * 100;
      
      // If participation is suspiciously high (>95%) and it's a current period,
      // estimate more realistic games_possible based on typical match frequency
      if (participation > 95 && gamesPossible < 10) {
        // Estimate ~25 games per 6-month period based on historical data
        const estimatedGamesPossible = 25;
        participation = (gamesPlayed / estimatedGamesPossible) * 100;
      }

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
        period = 'Unknown';
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
    const currentTrendRating = (freshPowerRatings as any)?.trend_rating || null;
    const currentTrendGoalThreat = (freshPowerRatings as any)?.trend_goal_threat || null;
    const currentTrendParticipation = (freshPowerRatings as any)?.trend_participation || null;
    
    // Calculate current participation from most recent block (fallback if database value missing)
    let currentParticipation = currentTrendParticipation;
    if (!currentTrendParticipation && sparklineData.length > 0) {
      currentParticipation = sparklineData[sparklineData.length - 1].participation;
    }

    const currentPercentiles = {
      power_rating: leagueMaximums.power_rating > 0 && currentTrendRating ? 
        Math.min(100, Math.round((currentTrendRating / leagueMaximums.power_rating) * 100)) : null,
      goal_threat: leagueMaximums.goal_threat > 0 && currentTrendGoalThreat ? 
        Math.min(100, Math.round((currentTrendGoalThreat / leagueMaximums.goal_threat) * 100)) : null,
      participation: currentParticipation ? Math.min(100, Math.round(currentParticipation)) : null
    };

    return NextResponse.json({
      success: true,
      data: {
        // Current metrics (3-metric system with sophisticated participation)
        current_metrics: {
          trend_rating: currentTrendRating,
          trend_goal_threat: currentTrendGoalThreat,
          trend_participation: currentTrendParticipation,
          league_avg_goal_threat: (freshPowerRatings as any)?.league_avg_goal_threat || 0,
          league_avg_participation: (freshPowerRatings as any)?.league_avg_participation || 75
        },
        
        // Current percentiles calculated from qualified players only
        current_percentiles: currentPercentiles,
        
        // League distribution for context
        league_distribution: leagueDistribution,
        
        // Sparkline data for trends visualization
        sparkline_data: sparklineData,
        
        // Qualified player count for transparency
        qualified_players_count: qualifiedStats.length,
        total_players_count: leagueStats?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 