import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define types for player data and ratings with new trend-based metrics
export interface PlayerRating {
  player_id: number;
  rating: number | null;
  variance: number | null;
  goal_threat: number | null;
  defensive_shield: number | null;
  trend_rating: number | null;
  trend_goal_threat: number | null;
  defensive_score: number | null;
  league_avg_goal_threat: number | null;
  league_avg_defensive_score: number | null;
}

export interface PlayerWithScore extends PlayerRating {
  score: number;
}

export interface TeamResult {
  teamA: number[];
  teamB: number[];
  balancePercent: number;
}

// Updated algorithm constants per specification
const DEFAULT_RATING = 5.35; // league prior mean for rating
const DEFAULT_VARIANCE = 0.10;
const MAX_HILL_CLIMB_ITERATIONS = 3000; // Increased from 2000
const GAP_THRESHOLD = 0.5; // Reduced from 1.0 for tighter balance
const EXTRA_ITERATIONS_THRESHOLD = 500; // For final validation
const IMBALANCE_THRESHOLD = 0.05; // 5% difference triggers extra iterations

export async function balanceByPastPerformance(
  supabaseClient: SupabaseClient,
  playerIds: number[]
): Promise<TeamResult> {
  // Fetch trend-adjusted ratings from Supabase
  const { data: fetchedRatings, error: fetchError } = await supabaseClient
    .from('aggregated_player_power_ratings')
    .select('player_id,rating,variance,goal_threat,defensive_shield,trend_rating,trend_goal_threat,defensive_score,league_avg_goal_threat,league_avg_defensive_score')
    .in('player_id', playerIds);

  if (fetchError) {
    console.error('Error fetching player ratings:', fetchError);
    throw new Error('Failed to fetch player ratings for balancing.');
  }

  const allPlayersWithRatings: PlayerRating[] = fetchedRatings || [];

  // Calculate league averages for trend_goal_threat and defensive_score from fetched data
  // Use precomputed values if available, otherwise calculate from current player pool
  let leagueAvgGoalThreat = 0;
  let leagueAvgDefensiveScore = 0;
  
  // Try to use precomputed league averages first
  const firstPlayerWithAverages = allPlayersWithRatings.find(p => 
    p.league_avg_goal_threat !== null && p.league_avg_defensive_score !== null
  );
  
  if (firstPlayerWithAverages) {
    leagueAvgGoalThreat = firstPlayerWithAverages.league_avg_goal_threat!;
    leagueAvgDefensiveScore = firstPlayerWithAverages.league_avg_defensive_score!;
  } else {
    // Fallback: calculate from current player pool
    let sumGoalThreat = 0;
    let countGoalThreat = 0;
    let sumDefensiveScore = 0;
    let countDefensiveScore = 0;

    allPlayersWithRatings.forEach(p => {
      if (p.trend_goal_threat !== null) {
        sumGoalThreat += p.trend_goal_threat;
        countGoalThreat++;
      }
      if (p.defensive_score !== null) {
        sumDefensiveScore += p.defensive_score;
        countDefensiveScore++;
      }
    });

    leagueAvgGoalThreat = countGoalThreat > 0 ? sumGoalThreat / countGoalThreat : 0.5;
    leagueAvgDefensiveScore = countDefensiveScore > 0 ? sumDefensiveScore / countDefensiveScore : 0.7;
  }

  // Prepare player data with NEW COMPOSITE SCORE FORMULA
  const playersData: PlayerWithScore[] = playerIds.map(id => {
    const ratingData = allPlayersWithRatings.find(p => p.player_id === id);
    
    // Use trend-adjusted metrics, fallback to original metrics, then defaults
    const trendRating = ratingData?.trend_rating ?? ratingData?.rating ?? DEFAULT_RATING;
    const trendGoalThreat = ratingData?.trend_goal_threat ?? ratingData?.goal_threat ?? leagueAvgGoalThreat;
    const defensiveScore = ratingData?.defensive_score ?? ratingData?.defensive_shield ?? leagueAvgDefensiveScore;
    const variance = ratingData?.variance ?? DEFAULT_VARIANCE;

    // NEW COMPOSITE SCORE FORMULA per specification:
    // score = trend_rating + 0.6 * (trend_goal_threat - league_avg_goal_threat) + 0.4 * (defensive_score - league_avg_defensive_score)
    const score = trendRating +
                  0.6 * (trendGoalThreat - leagueAvgGoalThreat) +
                  0.4 * (defensiveScore - leagueAvgDefensiveScore);

    return {
      player_id: id,
      rating: ratingData?.rating ?? DEFAULT_RATING,
      variance,
      goal_threat: ratingData?.goal_threat ?? leagueAvgGoalThreat,
      defensive_shield: ratingData?.defensive_shield ?? leagueAvgDefensiveScore,
      trend_rating: trendRating,
      trend_goal_threat: trendGoalThreat,
      defensive_score: defensiveScore,
      league_avg_goal_threat: leagueAvgGoalThreat,
      league_avg_defensive_score: leagueAvgDefensiveScore,
      score
    };
  });

  // Sort players by composite score in descending order
  playersData.sort((a, b) => b.score - a.score);

  // Perform MODIFIED SNAKE DRAFT (4-position cycle per specification)
  let teamA_ids: number[] = [];
  let teamB_ids: number[] = [];
  
  playersData.forEach((player, index) => {
    // Modified snake draft: 1st(0), 4th(3), 5th(4), 8th(7) → Team A
    //                      2nd(1), 3rd(2), 6th(5), 7th(6) → Team B
    if (index % 4 === 0 || index % 4 === 3) {
      teamA_ids.push(player.player_id);
    } else {
      teamB_ids.push(player.player_id);
    }
  });

  // ENHANCED HILL-CLIMBING OPTIMIZATION
  const calculateTeamScore = (teamPlayerIds: number[]): number => {
    return teamPlayerIds.reduce((totalScore, playerId) => {
      const playerData = playersData.find(p => p.player_id === playerId);
      return totalScore + (playerData?.score || 0);
    }, 0);
  };

  let currentTeamA = [...teamA_ids];
  let currentTeamB = [...teamB_ids];
  let currentGap = Math.abs(calculateTeamScore(currentTeamA) - calculateTeamScore(currentTeamB));
  let iterationsWithoutImprovement = 0;

  // Main optimization loop with enhanced termination conditions
  for (let i = 0; i < MAX_HILL_CLIMB_ITERATIONS; i++) {
    // Enhanced termination conditions
    if (currentGap < GAP_THRESHOLD) {
      console.log(`Hill-climbing terminated early at iteration ${i} with gap ${currentGap.toFixed(3)}`);
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

    // Create new potential teams
    const nextTeamA = [...currentTeamA];
    const nextTeamB = [...currentTeamB];
    nextTeamA[playerAIndex] = playerBId;
    nextTeamB[playerBIndex] = playerAId;

    const newGap = Math.abs(calculateTeamScore(nextTeamA) - calculateTeamScore(nextTeamB));

    if (newGap < currentGap) {
      currentTeamA = nextTeamA;
      currentTeamB = nextTeamB;
      currentGap = newGap;
      iterationsWithoutImprovement = 0; // Reset counter on improvement
    } else {
      iterationsWithoutImprovement++;
    }
  }

  // VALIDATION: Check if teams differ by >5% and add extra iterations if needed
  const totalA = calculateTeamScore(currentTeamA);
  const totalB = calculateTeamScore(currentTeamB);
  const imbalanceRatio = Math.abs(totalA - totalB) / ((totalA + totalB) / 2);
  
  if (imbalanceRatio > IMBALANCE_THRESHOLD) {
    console.log(`Teams differ by ${(imbalanceRatio * 100).toFixed(1)}%, running ${EXTRA_ITERATIONS_THRESHOLD} extra iterations`);
    
    // Run additional iterations for final optimization
    for (let i = 0; i < EXTRA_ITERATIONS_THRESHOLD; i++) {
      if (currentGap < GAP_THRESHOLD) break;
      if (currentTeamA.length === 0 || currentTeamB.length === 0) break;

      const playerAIndex = Math.floor(Math.random() * currentTeamA.length);
      const playerBIndex = Math.floor(Math.random() * currentTeamB.length);

      const playerAId = currentTeamA[playerAIndex];
      const playerBId = currentTeamB[playerBIndex];

      const nextTeamA = [...currentTeamA];
      const nextTeamB = [...currentTeamB];
      nextTeamA[playerAIndex] = playerBId;
      nextTeamB[playerBIndex] = playerAId;

      const newGap = Math.abs(calculateTeamScore(nextTeamA) - calculateTeamScore(nextTeamB));

      if (newGap < currentGap) {
        currentTeamA = nextTeamA;
        currentTeamB = nextTeamB;
        currentGap = newGap;
      }
    }
  }

  // Calculate final balance percentage with ENHANCED FORMULA
  const playerMap = playersData.reduce((map, player) => {
    map[player.player_id] = player;
    return map;
  }, {} as Record<number, PlayerWithScore>);

  const finalTotalA = calculateTeamScore(currentTeamA);
  const finalTotalB = calculateTeamScore(currentTeamB);
  
  let balancePercent = 0;
  if (currentTeamA.length > 0 || currentTeamB.length > 0) {
    const meanAB = (finalTotalA + finalTotalB) / 2;
    if (meanAB !== 0) {
      const gap = Math.abs(finalTotalA - finalTotalB);
      // Enhanced balance percentage formula: balancePercent = 100 - (ABS(totalA - totalB) / ((totalA + totalB) / 2) * 100)
      balancePercent = Math.max(0, Math.min(100, 100 - (gap / meanAB) * 100));
    } else if (finalTotalA === 0 && finalTotalB === 0) {
      balancePercent = 100;
    }
  }

  console.log(`Final balance: Team A: ${finalTotalA.toFixed(2)}, Team B: ${finalTotalB.toFixed(2)}, Gap: ${currentGap.toFixed(3)}, Balance: ${balancePercent.toFixed(1)}%`);

  return { 
    teamA: currentTeamA, 
    teamB: currentTeamB, 
    balancePercent: Math.round(balancePercent * 10) / 10 // Round to 1 decimal place
  };
} 