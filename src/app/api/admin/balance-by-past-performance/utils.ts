import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define types for player data and ratings
export interface PlayerRating {
  player_id: number;
  rating: number | null;
  variance: number | null;
  goal_threat: number | null;
  defensive_shield: number | null;
}

export interface PlayerWithScore extends PlayerRating {
  score: number;
}

export interface TeamResult {
  teamA: number[];
  teamB: number[];
  balancePercent: number;
}

// Supabase client initialization
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALPHA = 0.6; // attack weight
const BETA = 0.4;  // defence weight
const DEFAULT_RATING = 5.35; // league prior mean for rating
const DEFAULT_VARIANCE = 0.10;
const MAX_HILL_CLIMB_ITERATIONS = 2000;
const GAP_THRESHOLD = 1.0;

export async function balanceByPastPerformance(
  supabaseClient: SupabaseClient, // Accept SupabaseClient as the first argument
  playerIds: number[]
): Promise<TeamResult> {
  // Fetch ratings from Supabase
  const { data: fetchedRatings, error: fetchError } = await supabaseClient
    .from('aggregated_player_power_ratings')
    .select('player_id,rating,variance,goal_threat,defensive_shield')
    .in('player_id', playerIds);

  if (fetchError) {
    console.error('Error fetching player ratings:', fetchError);
    throw new Error('Failed to fetch player ratings for balancing.');
  }

  const allPlayersWithRatings: PlayerRating[] = fetchedRatings || [];

  // Calculate league averages for goal_threat and defensive_shield from fetched data
  let sumGoalThreat = 0;
  let countGoalThreat = 0;
  let sumDefensiveShield = 0;
  let countDefensiveShield = 0;

  allPlayersWithRatings.forEach(p => {
    if (p.goal_threat !== null) {
      sumGoalThreat += p.goal_threat;
      countGoalThreat++;
    }
    if (p.defensive_shield !== null) {
      sumDefensiveShield += p.defensive_shield;
      countDefensiveShield++;
    }
  });

  const leagueAvgGoalThreat = countGoalThreat > 0 ? sumGoalThreat / countGoalThreat : 0;
  const leagueAvgDefensiveShield = countDefensiveShield > 0 ? sumDefensiveShield / countDefensiveShield : 0;

  // Prepare player data, applying defaults for missing rows or null values
  const playersData: PlayerWithScore[] = playerIds.map(id => {
    const ratingData = allPlayersWithRatings.find(p => p.player_id === id);
    const rating = ratingData?.rating ?? DEFAULT_RATING;
    const variance = ratingData?.variance ?? DEFAULT_VARIANCE; // Not used in score but fetched
    const goal_threat = ratingData?.goal_threat ?? leagueAvgGoalThreat;
    const defensive_shield = ratingData?.defensive_shield ?? leagueAvgDefensiveShield;

    const score = rating +
                  ALPHA * (goal_threat - leagueAvgGoalThreat) +
                  BETA * (defensive_shield - leagueAvgDefensiveShield);
    return {
      player_id: id,
      rating,
      variance,
      goal_threat,
      defensive_shield,
      score
    };
  });

  // Sort players by score in descending order
  playersData.sort((a, b) => b.score - a.score);

  // Perform snake draft
  let teamA_ids: number[] = [];
  let teamB_ids: number[] = [];
  playersData.forEach((player, index) => {
    if (index % 4 === 0 || index % 4 === 3) { // 1st (0), 4th (3), 5th (4), 8th (7) ...
      teamA_ids.push(player.player_id);
    } else { // 2nd (1), 3rd (2), 6th (5), 7th (6) ...
      teamB_ids.push(player.player_id);
    }
  });

  // Hill-climbing improvement
  const calculateTeamScore = (teamPlayerIds: number[]): number => {
    return teamPlayerIds.reduce((totalScore, playerId) => {
      const playerData = playersData.find(p => p.player_id === playerId);
      return totalScore + (playerData?.score || 0);
    }, 0);
  };

  let currentTeamA = [...teamA_ids];
  let currentTeamB = [...teamB_ids];
  let currentGap = Math.abs(calculateTeamScore(currentTeamA) - calculateTeamScore(currentTeamB));

  for (let i = 0; i < MAX_HILL_CLIMB_ITERATIONS; i++) {
    if (currentGap < GAP_THRESHOLD) {
      break;
    }

    // Select random players to swap from each team
    if (currentTeamA.length === 0 || currentTeamB.length === 0) break; // Avoid error if a team is empty
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
    }
  }

  // Calculate balancePercent
  const playerMap = playersData.reduce((map, player) => {
    map[player.player_id] = player;
    return map;
  }, {} as Record<number, PlayerWithScore>);

  const totalA  = currentTeamA.reduce((s,id)=>s + (playerMap[id]?.score || 0) ,0);
  const totalB  = currentTeamB.reduce((s,id)=>s + (playerMap[id]?.score || 0) ,0);
  
  let balancePercent = 0;
  if (currentTeamA.length > 0 || currentTeamB.length > 0) { // Avoid division by zero if teams are empty
    const meanAB  = (totalA + totalB) / 2;
    if (meanAB !== 0) { // Avoid division by zero if meanAB is 0
        const gap = Math.abs(totalA - totalB);
        balancePercent = Math.max(0, Math.min(100, 100 - (gap / meanAB) * 100));
    } else if (totalA === 0 && totalB === 0) { // If both sums are 0, teams are perfectly balanced in terms of score sum
        balancePercent = 100;
    }
  }

  return { teamA: currentTeamA, teamB: currentTeamB, balancePercent };
} 