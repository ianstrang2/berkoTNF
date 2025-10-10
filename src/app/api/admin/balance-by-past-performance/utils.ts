import { prisma } from '@/lib/prisma';
import { withTenantFilter } from '@/lib/tenantFilter';

// Player rating interface for new EWMA data
interface PlayerRating {
  player_id: number;
  power_rating: number | null;
  goal_threat: number | null;
  is_qualified: boolean | null;
  weighted_played: number | null;
  players?: {
    is_ringer: boolean;
  };
}

// Player data with 2-metric scores
interface PlayerWithScore {
  player_id: number;
  rating: number;
  variance: number;
  goal_threat: number;
  trend_rating: number;
  trend_goal_threat: number;
  league_avg_goal_threat: number;
}

// Team result interface
interface TeamResult {
  teamA: number[];
  teamB: number[];
  balancePercent: number;
  totalA: number;
  totalB: number;
  powerGap: number;
  goalGap: number;
}

// Updated algorithm constants for 2-metric system
const DEFAULT_RATING = 5.35; // league prior mean for rating
const DEFAULT_VARIANCE = 0.10;
const MAX_HILL_CLIMB_ITERATIONS = 3000;
const COMBINED_LOSS_THRESHOLD = 1.0; // Target combined normalized loss
const EXTRA_ITERATIONS_THRESHOLD = 500;
const IMPROVEMENT_THRESHOLD = 0.95; // 95% confidence threshold for accepting improvements

export async function balanceByPastPerformance(
  _unused_supabaseClient: any, // Keep parameter for compatibility but don't use
  playerIds: number[],
  performanceWeights?: { power_weight: number; goal_weight: number },
  targetSizes?: { a: number; b: number },
  tenantId?: string // Add optional tenant ID for filtering
): Promise<TeamResult> {
  // Get performance weights (use provided or fetch from database)
  let weights = performanceWeights;
  if (!weights) {
    try {
      const weightsResponse = await fetch('/api/admin/performance-weights');
      if (weightsResponse.ok) {
        const weightsData = await weightsResponse.json();
        if (weightsData.success) {
          weights = weightsData.data;
        }
      }
    } catch (error) {
      console.warn('Could not fetch performance weights from API, using fallback defaults:', error);
    }
    // Fallback only if fetch failed (should not happen after proper setup)
    weights = weights || { power_weight: 0.5, goal_weight: 0.5 };
  }

  // UPDATED: Use new EWMA performance ratings table - RLS disabled, using explicit tenant filter
  // Tenant ID is required for security
  if (!tenantId) {
    throw new Error('[SECURITY] Tenant ID is required for balance algorithm');
  }
  
  const fetchedRatings = await prisma.aggregated_performance_ratings.findMany({
    where: withTenantFilter(tenantId, {
      player_id: { in: playerIds }
    }),
    select: {
      player_id: true,
      power_rating: true,    // Direct field (no trend_rating)
      goal_threat: true,     // Direct field (no trend_goal_threat) 
      participation: true,
      is_qualified: true,
      weighted_played: true,
      players: {
        select: {
          is_ringer: true
        }
      }
    }
  });

  if (!fetchedRatings) {
    console.error('Error fetching player ratings: No data returned');
    throw new Error('Failed to fetch player ratings for balancing.');
  }

  // Calculate league average from qualified non-ringer players only
  const qualifiedRatings = fetchedRatings.filter(p => 
    p.is_qualified && !p.players?.is_ringer
  );

  const leagueAvgGoalThreat = qualifiedRatings.length > 0 
    ? qualifiedRatings.reduce((sum, p) => sum + Number(p.goal_threat || 0), 0) / qualifiedRatings.length
    : 0.5; // Default fallback

  // UPDATED: Ringer-aware data mapping with qualification logic
  const playersData: PlayerWithScore[] = playerIds.map(id => {
    const ratingData = fetchedRatings.find(p => p.player_id === id);
    
    // Use EWMA values if qualified (including ringers), otherwise defaults/league averages
    const useRealValues = ratingData?.is_qualified || false;
    
    return {
      player_id: id,
      rating: useRealValues && ratingData ? Number(ratingData.power_rating) : DEFAULT_RATING,
      variance: DEFAULT_VARIANCE, // EWMA provides inherent confidence
      goal_threat: useRealValues && ratingData ? Number(ratingData.goal_threat) : leagueAvgGoalThreat,
      trend_rating: useRealValues && ratingData ? Number(ratingData.power_rating) : DEFAULT_RATING,
      trend_goal_threat: useRealValues && ratingData ? Number(ratingData.goal_threat) : leagueAvgGoalThreat,
      league_avg_goal_threat: leagueAvgGoalThreat
    };
  });

  // Sort players by power rating in descending order (primary metric)
  playersData.sort((a, b) => b.trend_rating - a.trend_rating);

  // Initial team assignment using snake draft (respecting target sizes for uneven teams)
  let teamA_ids: number[] = [];
  let teamB_ids: number[] = [];
  
  if (targetSizes) {
    // For uneven teams, use a modified snake draft that respects target sizes
    playersData.forEach((player, index) => {
      // Fill teams until they reach target sizes
      if (teamA_ids.length < targetSizes.a && (teamB_ids.length >= targetSizes.b || index % 2 === 0)) {
        teamA_ids.push(player.player_id);
      } else {
        teamB_ids.push(player.player_id);
      }
    });
  } else {
    // Original snake draft for even teams
    playersData.forEach((player, index) => {
      // Snake draft: 1st, 4th, 5th, 8th → Team A; 2nd, 3rd, 6th, 7th → Team B
      if (index % 4 === 0 || index % 4 === 3) {
        teamA_ids.push(player.player_id);
      } else {
        teamB_ids.push(player.player_id);
      }
    });
  }

  // Multi-objective range normalization functions
  const calculateTeamTotals = (teamPlayerIds: number[]) => {
    const powerTotal = teamPlayerIds.reduce((sum, playerId) => {
      const player = playersData.find(p => p.player_id === playerId);
      return sum + (player?.trend_rating || 0);
    }, 0);
    
    const goalTotal = teamPlayerIds.reduce((sum, playerId) => {
      const player = playersData.find(p => p.player_id === playerId);
      return sum + (player?.trend_goal_threat || 0);
    }, 0);
    
    return { powerTotal, goalTotal };
  };

  const calculateRangeNormalizationLoss = (teamA: number[], teamB: number[]) => {
    const totalsA = calculateTeamTotals(teamA);
    const totalsB = calculateTeamTotals(teamB);
    
    // Calculate ranges (max - min) for normalization
    const powerRange = Math.max(
      Math.abs(totalsA.powerTotal - totalsB.powerTotal),
      0.1 // Minimum range to prevent division by zero
    );
    
    const goalRange = Math.max(
      Math.abs(totalsA.goalTotal - totalsB.goalTotal),
      0.01 // Minimum range for goals
    );
    
    // Get min and max for range calculation
    const powerMin = Math.min(totalsA.powerTotal, totalsB.powerTotal);
    const powerMax = Math.max(totalsA.powerTotal, totalsB.powerTotal);
    const goalMin = Math.min(totalsA.goalTotal, totalsB.goalTotal);
    const goalMax = Math.max(totalsA.goalTotal, totalsB.goalTotal);
    
    // Calculate actual ranges across the pool for normalization
    const allPowerRatings = playersData.map(p => p.trend_rating);
    const allGoalThreats = playersData.map(p => p.trend_goal_threat);
    
    const powerPoolRange = Math.max(...allPowerRatings) - Math.min(...allPowerRatings);
    const goalPoolRange = Math.max(...allGoalThreats) - Math.min(...allGoalThreats);
    
    // Range normalization: gap / pool_range
    const powerGapNormalized = powerPoolRange > 0 ? powerRange / powerPoolRange : 0;
    const goalGapNormalized = goalPoolRange > 0 ? goalRange / goalPoolRange : 0;
    
    // Combined loss function (configurable weighting)
    const combinedLoss = (powerGapNormalized * weights.power_weight) + (goalGapNormalized * weights.goal_weight);
    
    return {
      combinedLoss,
      powerGapNormalized,
      goalGapNormalized,
      rawPowerGap: powerRange,
      rawGoalGap: goalRange
    };
  };

  // Hill-climbing optimization with multi-objective approach
  let currentTeamA = [...teamA_ids];
  let currentTeamB = [...teamB_ids];
  let currentLoss = calculateRangeNormalizationLoss(currentTeamA, currentTeamB);
  let iterationsWithoutImprovement = 0;

  console.log(`Initial balance - Combined Loss: ${currentLoss.combinedLoss.toFixed(3)}, Power Gap: ${currentLoss.rawPowerGap.toFixed(2)}, Goal Gap: ${currentLoss.rawGoalGap.toFixed(3)}`);

  // Main optimization loop
  for (let i = 0; i < MAX_HILL_CLIMB_ITERATIONS; i++) {
    // Termination conditions
    if (currentLoss.combinedLoss < COMBINED_LOSS_THRESHOLD) {
      console.log(`Hill-climbing terminated early at iteration ${i} with combined loss ${currentLoss.combinedLoss.toFixed(3)}`);
      break;
    }
    
    if (iterationsWithoutImprovement >= 500) {
      console.log(`Hill-climbing terminated after ${i} iterations with ${iterationsWithoutImprovement} iterations without improvement`);
      break;
    }

    // Select random players to swap from each team
    if (currentTeamA.length === 0 || currentTeamB.length === 0) break;
    const playerAIndex = Math.floor(Math.random() * currentTeamA.length);
    const playerBIndex = Math.floor(Math.random() * currentTeamB.length);

    const playerAId = currentTeamA[playerAIndex];
    const playerBId = currentTeamB[playerBIndex];

    // Create potential new teams
    const nextTeamA = [...currentTeamA];
    const nextTeamB = [...currentTeamB];
    nextTeamA[playerAIndex] = playerBId;
    nextTeamB[playerBIndex] = playerAId;

    const newLoss = calculateRangeNormalizationLoss(nextTeamA, nextTeamB);

    // Accept improvement if combined loss decreases
    if (newLoss.combinedLoss < currentLoss.combinedLoss) {
      currentTeamA = nextTeamA;
      currentTeamB = nextTeamB;
      currentLoss = newLoss;
      iterationsWithoutImprovement = 0;
      
      // Log significant improvements
      if (i % 500 === 0 || newLoss.combinedLoss < currentLoss.combinedLoss * 0.9) {
        console.log(`Iteration ${i}: Improved to combined loss ${newLoss.combinedLoss.toFixed(3)}`);
      }
    } else {
      iterationsWithoutImprovement++;
    }
  }

  // Additional iterations if balance is still poor
  if (currentLoss.combinedLoss > COMBINED_LOSS_THRESHOLD * 1.5) {
    console.log(`Running ${EXTRA_ITERATIONS_THRESHOLD} extra iterations - combined loss still ${currentLoss.combinedLoss.toFixed(3)}`);
    
    for (let i = 0; i < EXTRA_ITERATIONS_THRESHOLD; i++) {
      if (currentLoss.combinedLoss < COMBINED_LOSS_THRESHOLD) break;
      if (currentTeamA.length === 0 || currentTeamB.length === 0) break;

      const playerAIndex = Math.floor(Math.random() * currentTeamA.length);
      const playerBIndex = Math.floor(Math.random() * currentTeamB.length);

      const playerAId = currentTeamA[playerAIndex];
      const playerBId = currentTeamB[playerBIndex];

      const nextTeamA = [...currentTeamA];
      const nextTeamB = [...currentTeamB];
      nextTeamA[playerAIndex] = playerBId;
      nextTeamB[playerBIndex] = playerAId;

      const newLoss = calculateRangeNormalizationLoss(nextTeamA, nextTeamB);

      if (newLoss.combinedLoss < currentLoss.combinedLoss) {
        currentTeamA = nextTeamA;
        currentTeamB = nextTeamB;
        currentLoss = newLoss;
      }
    }
  }

  // Calculate final metrics for response
  const finalTotalsA = calculateTeamTotals(currentTeamA);
  const finalTotalsB = calculateTeamTotals(currentTeamB);
  
  // Balance percentage based on combined loss (lower loss = higher percentage)
  const balancePercent = Math.max(0, Math.min(100, 
    100 - (currentLoss.combinedLoss * 50) // Scale combined loss to percentage
  ));

  console.log(`Final balance - Combined Loss: ${currentLoss.combinedLoss.toFixed(3)}, Balance: ${balancePercent.toFixed(1)}%`);
  console.log(`Power totals - Team A: ${finalTotalsA.powerTotal.toFixed(2)}, Team B: ${finalTotalsB.powerTotal.toFixed(2)}, Gap: ${currentLoss.rawPowerGap.toFixed(2)}`);
  console.log(`Goal totals - Team A: ${finalTotalsA.goalTotal.toFixed(3)}, Team B: ${finalTotalsB.goalTotal.toFixed(3)}, Gap: ${currentLoss.rawGoalGap.toFixed(3)}`);

  // ENHANCED: Position players by goal threat within each team
  // Sort each team by goal threat (ascending) so highest goal threat is in highest slot
  const sortedTeamA = currentTeamA.sort((a, b) => {
    const playerA = playersData.find(p => p.player_id === a);
    const playerB = playersData.find(p => p.player_id === b);
    return (playerA?.trend_goal_threat || 0) - (playerB?.trend_goal_threat || 0);
  });

  const sortedTeamB = currentTeamB.sort((a, b) => {
    const playerA = playersData.find(p => p.player_id === a);
    const playerB = playersData.find(p => p.player_id === b);
    return (playerA?.trend_goal_threat || 0) - (playerB?.trend_goal_threat || 0);
  });

  console.log('Goal threat positioning applied - highest goal threat players in highest slots');

  return {
    teamA: sortedTeamA,
    teamB: sortedTeamB,
    balancePercent,
    totalA: finalTotalsA.powerTotal,
    totalB: finalTotalsB.powerTotal,
    powerGap: currentLoss.rawPowerGap,
    goalGap: currentLoss.rawGoalGap
  };
} 