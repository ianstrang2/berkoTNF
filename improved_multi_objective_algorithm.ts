// Improved Multi-Objective Balance Algorithm
// Addresses goal threat over-weighting identified in validation data

interface BalanceMetrics {
  powerRating: number;
  goalThreat: number;
}

interface LeagueStats {
  powerRating: {
    mean: number;
    stdDev: number;
    coeffVar: number; // stdDev / mean
  };
  goalThreat: {
    mean: number;
    stdDev: number;
    coeffVar: number;
  };
}

// Calculate league statistics for normalization
function calculateLeagueStats(playerPool: BalanceMetrics[]): LeagueStats {
  const powerRatings = playerPool.map(p => p.powerRating);
  const goalThreats = playerPool.map(p => p.goalThreat);
  
  const powerMean = powerRatings.reduce((sum, val) => sum + val, 0) / powerRatings.length;
  const goalMean = goalThreats.reduce((sum, val) => sum + val, 0) / goalThreats.length;
  
  const powerStdDev = Math.sqrt(
    powerRatings.reduce((sum, val) => sum + Math.pow(val - powerMean, 2), 0) / powerRatings.length
  );
  const goalStdDev = Math.sqrt(
    goalThreats.reduce((sum, val) => sum + Math.pow(val - goalMean, 2), 0) / goalThreats.length
  );
  
  return {
    powerRating: {
      mean: powerMean,
      stdDev: powerStdDev,
      coeffVar: powerStdDev / powerMean
    },
    goalThreat: {
      mean: goalMean,
      stdDev: goalStdDev,
      coeffVar: goalStdDev / goalMean
    }
  };
}

// OPTION 1: Coefficient of Variation Normalization (RECOMMENDED)
function calculateMultiObjectiveBalanceCoeffVar(
  teamA: BalanceMetrics[],
  teamB: BalanceMetrics[],
  leagueStats: LeagueStats,
  useWeighting: boolean = false
): number {
  // Calculate team totals
  const teamAPower = teamA.reduce((sum, p) => sum + p.powerRating, 0);
  const teamBPower = teamB.reduce((sum, p) => sum + p.powerRating, 0);
  const teamAGoals = teamA.reduce((sum, p) => sum + p.goalThreat, 0);
  const teamBGoals = teamB.reduce((sum, p) => sum + p.goalThreat, 0);

  // Calculate gaps
  const powerGap = Math.abs(teamAPower - teamBPower);
  const goalGap = Math.abs(teamAGoals - teamBGoals);

  // Normalize using coefficient of variation (addresses scale differences)
  const powerGapNorm = powerGap / (leagueStats.powerRating.mean * leagueStats.powerRating.coeffVar);
  const goalGapNorm = goalGap / (leagueStats.goalThreat.mean * leagueStats.goalThreat.coeffVar);

  // Return combined loss
  if (useWeighting) {
    return 0.6 * powerGapNorm + 0.4 * goalGapNorm;
  } else {
    return powerGapNorm + goalGapNorm;
  }
}

// OPTION 2: Range Normalization (Alternative)
function calculateMultiObjectiveBalanceRange(
  teamA: BalanceMetrics[],
  teamB: BalanceMetrics[],
  playerPool: BalanceMetrics[],
  useWeighting: boolean = false
): number {
  // Calculate team totals
  const teamAPower = teamA.reduce((sum, p) => sum + p.powerRating, 0);
  const teamBPower = teamB.reduce((sum, p) => sum + p.powerRating, 0);
  const teamAGoals = teamA.reduce((sum, p) => sum + p.goalThreat, 0);
  const teamBGoals = teamB.reduce((sum, p) => sum + p.goalThreat, 0);

  // Calculate gaps
  const powerGap = Math.abs(teamAPower - teamBPower);
  const goalGap = Math.abs(teamAGoals - teamBGoals);

  // Calculate ranges for normalization
  const powerRatings = playerPool.map(p => p.powerRating);
  const goalThreats = playerPool.map(p => p.goalThreat);
  
  const powerRange = Math.max(...powerRatings) - Math.min(...powerRatings);
  const goalRange = Math.max(...goalThreats) - Math.min(...goalThreats);

  // Normalize using ranges
  const powerGapNorm = powerGap / powerRange;
  const goalGapNorm = goalGap / goalRange;

  // Return combined loss
  if (useWeighting) {
    return 0.6 * powerGapNorm + 0.4 * goalGapNorm;
  } else {
    return powerGapNorm + goalGapNorm;
  }
}

// OPTION 3: Percentile-Based Normalization (Most Robust)
function calculateMultiObjectiveBalancePercentile(
  teamA: BalanceMetrics[],
  teamB: BalanceMetrics[],
  playerPool: BalanceMetrics[],
  useWeighting: boolean = false
): number {
  // Calculate team totals
  const teamAPower = teamA.reduce((sum, p) => sum + p.powerRating, 0);
  const teamBPower = teamB.reduce((sum, p) => sum + p.powerRating, 0);
  const teamAGoals = teamA.reduce((sum, p) => sum + p.goalThreat, 0);
  const teamBGoals = teamB.reduce((sum, p) => sum + p.goalThreat, 0);

  // Calculate gaps
  const powerGap = Math.abs(teamAPower - teamBPower);
  const goalGap = Math.abs(teamAGoals - teamBGoals);

  // Calculate 10th-90th percentile ranges for normalization
  const powerRatings = playerPool.map(p => p.powerRating).sort((a, b) => a - b);
  const goalThreats = playerPool.map(p => p.goalThreat).sort((a, b) => a - b);
  
  const powerP10 = powerRatings[Math.floor(powerRatings.length * 0.1)];
  const powerP90 = powerRatings[Math.floor(powerRatings.length * 0.9)];
  const goalP10 = goalThreats[Math.floor(goalThreats.length * 0.1)];
  const goalP90 = goalThreats[Math.floor(goalThreats.length * 0.9)];

  // Normalize using percentile ranges (more robust to outliers)
  const powerGapNorm = powerGap / (powerP90 - powerP10);
  const goalGapNorm = goalGap / (goalP90 - goalP10);

  // Return combined loss
  if (useWeighting) {
    return 0.6 * powerGapNorm + 0.4 * goalGapNorm;
  } else {
    return powerGapNorm + goalGapNorm;
  }
}

// Test all three approaches with your validation data
function testNormalizationApproaches() {
  // Your validation data
  const samplePlayerPool: BalanceMetrics[] = [
    // Based on your data: power range 1.45-14.21, goal range 0.000-1.500
    { powerRating: 14.21, goalThreat: 1.500 },
    { powerRating: 6.01, goalThreat: 0.383 },   // Mean values
    { powerRating: 1.45, goalThreat: 0.000 },
    // Add more sample players...
  ];

  const leagueStats: LeagueStats = {
    powerRating: { mean: 6.01, stdDev: 4.08, coeffVar: 0.678 },
    goalThreat: { mean: 0.383, stdDev: 0.395, coeffVar: 1.029 }
  };

  // Test scenario: power gap = 0.795, goal gap = 1.200 (from your data)
  const teamA: BalanceMetrics[] = [{ powerRating: 66.12, goalThreat: 4.35 }];
  const teamB: BalanceMetrics[] = [{ powerRating: 66.91, goalThreat: 3.15 }];

  console.log('Original Standard Deviation Approach:');
  const stdDevNorm = 0.795 / 4.08 + 1.200 / 0.395; // 0.195 + 3.038 = 3.233
  console.log(`Power gap norm: ${0.795 / 4.08}, Goal gap norm: ${1.200 / 0.395}, Total: ${stdDevNorm}`);

  console.log('\nCoefficient of Variation Approach:');
  const coeffVarBalance = calculateMultiObjectiveBalanceCoeffVar(teamA, teamB, leagueStats);
  console.log(`Coefficient of Variation Balance: ${coeffVarBalance}`);

  console.log('\nRange Approach:');
  const rangeBalance = calculateMultiObjectiveBalanceRange(teamA, teamB, samplePlayerPool);
  console.log(`Range Balance: ${rangeBalance}`);

  console.log('\nPercentile Approach:');
  const percentileBalance = calculateMultiObjectiveBalancePercentile(teamA, teamB, samplePlayerPool);
  console.log(`Percentile Balance: ${percentileBalance}`);
}

export {
  calculateMultiObjectiveBalanceCoeffVar,
  calculateMultiObjectiveBalanceRange,
  calculateMultiObjectiveBalancePercentile,
  testNormalizationApproaches
}; 