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

    // Use Prisma for league stats too - get all qualified players (STRICTER FILTERING)
    const leagueStats = await prisma.aggregated_player_power_ratings.findMany({
      where: {
        trend_rating: { not: null },
        effective_games: { gte: 15 }  // FIXED: Apply minimum games filter at database level
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

    // FIXED: Use P90 instead of MAX to prevent outlier contamination
    const leagueMaximums = leagueStats.length > 0 ? {
      power_rating: leagueDistribution.power_rating.p90, // Use P90 instead of MAX
      goal_threat: leagueDistribution.goal_threat.p90,   // Use P90 instead of MAX
      participation: 100 // Participation is naturally 0-100%
    } : { 
      power_rating: 15, 
      goal_threat: 1.0, 
      participation: 100 
    };

    // Determine player tier for consistent minimum game requirements
    const playerPowerData = await prisma.aggregated_player_power_ratings.findUnique({
      where: { player_id: playerId },
      select: { effective_games: true } as any
    });
    
    const totalCareerGames = Number((playerPowerData as any)?.effective_games || 0);
    let playerTier: string;
    let tierMinGames: number;
    
    if (totalCareerGames <= 30) {
      playerTier = 'NEW';
      tierMinGames = 3;
    } else if (totalCareerGames <= 75) {
      playerTier = 'DEVELOPING'; 
      tierMinGames = 6;
    } else {
      playerTier = 'ESTABLISHED';
      tierMinGames = 10;
    }

    // Process historical blocks for sparkline data
    const historicalBlocks = ((trendData as any)?.historical_blocks as any[]) || [];
    const sparklineData: Array<{
      period: string;
      start_date: string;
      end_date: string;
      power_rating: number;
      goal_threat: number;
      participation: number | null;  // Allow null for insufficient data
      power_rating_percentile: number;
      goal_threat_percentile: number | null;  // FIXED: Allow null for insufficient data (consistent with participation)
      participation_percentile: number | null;  // Allow null for insufficient data
      games_played: number;
    }> = [];

    // NEW: Function to calculate period-specific percentiles
    const calculatePeriodPercentile = async (blockStartDate: string, powerRating: number, goalThreat: number): Promise<{powerPercentile: number, goalPercentile: number}> => {
      try {
        // Get all players' data for this specific period
        const allPlayersData = await prisma.aggregated_half_season_stats.findMany({
          select: { historical_blocks: true } as any
        });

        const periodRatings: number[] = [];
        const periodGoals: number[] = [];

        for (const player of allPlayersData) {
          const blocks = (player as any).historical_blocks || [];
          const matchingBlock = blocks.find((block: any) => 
            block.start_date === blockStartDate && 
            (block.games_played || 0) >= 10  // Minimum games for period comparison
          );

          if (matchingBlock) {
            const blockRating = (matchingBlock.fantasy_points || 0) / Math.max(matchingBlock.games_played || 1, 1);
            const blockGoals = Math.min(1.5, (matchingBlock.goals || 0) / Math.max(matchingBlock.games_played || 1, 1));
            
            periodRatings.push(blockRating);
            periodGoals.push(blockGoals);
          }
        }

        if (periodRatings.length === 0) {
          return { powerPercentile: 50, goalPercentile: 50 }; // Fallback
        }

        // Calculate percentile rank within this period
        periodRatings.sort((a, b) => a - b);
        periodGoals.sort((a, b) => a - b);

        const powerRank = periodRatings.filter(r => r <= powerRating).length;
        const goalRank = periodGoals.filter(g => g <= goalThreat).length;

        return {
          powerPercentile: Math.round((powerRank / periodRatings.length) * 100),
          goalPercentile: Math.round((goalRank / periodGoals.length) * 100)
        };

      } catch (error) {
        console.warn('Failed to calculate period-specific percentile:', error);
        // Fallback to current method if period calculation fails
        return {
          powerPercentile: Math.min(100, Math.round((powerRating / leagueMaximums.power_rating) * 100)),
          goalPercentile: Math.min(100, Math.round((goalThreat / leagueMaximums.goal_threat) * 100))
        };
      }
    };

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
      
      // Apply tier-based minimum games consistently across all metrics
      let participation: number | null = null;
      let participationPercentile: number | null = null;
      let goalThreatPercentile: number | null = null;
      
      if (gamesPlayed >= tierMinGames) {
        // Only calculate percentiles if player meets tier minimum games requirement
        participation = (gamesPlayed / Math.max(gamesPossible, 1)) * 100;
        participationPercentile = Math.min(100, Math.round(participation));
        
        // FIXED: Calculate goal threat percentile only with sufficient games (like participation)
        const periodPercentiles = await calculatePeriodPercentile(block.start_date, powerRating, goalThreat);
        goalThreatPercentile = periodPercentiles.goalPercentile;
      }
      // If insufficient games for tier, leave both participation and goal threat as null

      // Power rating percentile is always calculated (it drives the main rating)
      const powerPercentiles = await calculatePeriodPercentile(block.start_date, powerRating, goalThreat);

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
        participation: participation !== null ? Math.round(participation * 10) / 10 : null,
        power_rating_percentile: powerPercentiles.powerPercentile,
        goal_threat_percentile: goalThreatPercentile,
        participation_percentile: participationPercentile,
        games_played: gamesPlayed
      });
    }

    // Current metric percentiles (for display) - use P90 scaling
    const currentTrendRating = (freshPowerRatings as any)?.trend_rating || null;
    const currentTrendGoalThreat = (freshPowerRatings as any)?.trend_goal_threat || null;
    const currentTrendParticipation = (freshPowerRatings as any)?.trend_participation || null;
    
    // Calculate current participation from most recent block (fallback if database value missing)
    let currentParticipation = currentTrendParticipation;
    if (!currentTrendParticipation && sparklineData.length > 0) {
      currentParticipation = sparklineData[sparklineData.length - 1].participation;
    }

    // FIXED: Use percentile ranking for all metrics instead of ratio-to-max for consistency
    const calculateCurrentPercentile = (playerValue: number, allValues: number[]): number => {
      if (allValues.length === 0) return 50; // Fallback
      allValues.sort((a, b) => a - b);
      const rank = allValues.filter(v => v <= playerValue).length;
      return Math.round((rank / allValues.length) * 100);
    };

    // Get all qualified player values for percentile calculation
    const allPowerRatings = leagueStats.map(s => (s as any).trend_rating || 0).filter(r => r > 0);
    const allGoalThreats = leagueStats.map(s => (s as any).trend_goal_threat || 0);

    const currentPercentiles = {
      power_rating: currentTrendRating ? 
        calculateCurrentPercentile(currentTrendRating, allPowerRatings) : null,
      goal_threat: currentTrendGoalThreat ? 
        calculateCurrentPercentile(currentTrendGoalThreat, allGoalThreats) : null,
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
        
        // Current percentiles calculated from qualified players only (using P90 scaling)
        current_percentiles: currentPercentiles,
        
        // League distribution for context
        league_distribution: leagueDistribution,
        
        // FIXED: Sparkline data now uses period-specific percentiles
        sparkline_data: sparklineData,
        
        // Qualified player count for transparency
        qualified_players_count: leagueStats.length,
        total_players_count: leagueStats.length
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 