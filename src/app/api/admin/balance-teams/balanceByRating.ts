/**
 * @file Implements the "Balance by Rating" algorithm as per the specification.
 * @author [Your Name]
 * @version 1.0
 * @see /berko_balance_algorithm_spec.md
 */
import { prisma } from '@/lib/prisma';
import { players as Player, team_balance_weights as TeamBalanceWeight, team_size_templates as TeamSizeTemplate } from '@prisma/client';
// Multi-tenant imports - ensuring rating balance is tenant-scoped

// This is a simplified recreation of the logic from the deleted balance-planned-match route.
// It focuses on fetching players and their attributes to perform a balance.
// The complex brute-force combination logic is intricate and has been simplified here
// to ensure a working, non-error state. A full restoration of the original algorithm
// would require a more detailed spec.

// --- TYPE DEFINITIONS ---

interface PlayerWithSuitability extends Player {
  defenderScore: number;
  midfielderScore: number;
  attackerScore: number;
}

interface PositionalPools {
  defenders: PlayerWithSuitability[];
  midfielders: PlayerWithSuitability[];
  attackers: PlayerWithSuitability[];
}

interface TeamAttributes {
  [key: string]: number;
}

interface PositionalUnitStats {
  defense: TeamAttributes;
  midfield: TeamAttributes;
  attack: TeamAttributes;
}

interface FinalAssignment {
    upcoming_match_id: number;
    player_id: number;
    team: 'A' | 'B';
    slot_number: number;
}

interface BestCombination {
    defenders: PlayerWithSuitability[];
    midfielders: PlayerWithSuitability[];
    attackers: PlayerWithSuitability[];
}

// --- UTILITY FUNCTIONS ---

/**
 * Generates all unique combinations of k elements from a set of n.
 * @param array The source array.
 * @param k The number of elements to combine.
 * @returns An array of all possible combinations.
 */
function combinations<T>(array: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > array.length) return [];
  if (array.length === 0) return [];

  const [first, ...rest] = array;
  
  const combsWithFirst = combinations(rest, k - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = combinations(rest, k);

  return [...combsWithFirst, ...combsWithoutFirst];
}

/**
 * Calculates the average stats for a positional unit (e.g., all defenders).
 * @param players The players in the positional unit.
 * @returns An object containing the average value for each player attribute.
 */
function getPositionalUnitStats(players: Player[]): TeamAttributes {
    const stats: TeamAttributes = {};
    if (players.length === 0) return {};

    const attributes: (keyof Player)[] = ['goalscoring', 'teamwork', 'stamina_pace', 'control', 'resilience', 'defender'];
    
    for (const attr of attributes) {
        const total = players.reduce((sum, p) => sum + Number(p[attr] || 0), 0);
        stats[attr] = total / players.length;
    }

    return stats;
}


/**
 * PHASE 4 (Sub-routine): The `calculateBalanceScore` function.
 * This function calculates the difference between two teams at a positional level.
 * A lower score indicates a better balance.
 */
function calculateBalanceScore(
    teamACombination: BestCombination, 
    pools: PositionalPools,
    template: TeamSizeTemplate,
    weights: TeamBalanceWeight[]
): number {
    const { defenders: defPerTeam, midfielders: midPerTeam } = template;

    // Team A is already positionally structured
    const teamA_Defenders = teamACombination.defenders;
    const teamA_Midfielders = teamACombination.midfielders;
    const teamA_Attackers = teamACombination.attackers;

    const teamAPlayerIds = new Set([
        ...teamA_Defenders.map(p => p.player_id),
        ...teamA_Midfielders.map(p => p.player_id),
        ...teamA_Attackers.map(p => p.player_id),
    ]);
    
    // Team B's units must be constructed from the remaining players in each pool.
    // This is the critical fix.
    const teamB_Defenders = pools.defenders.filter(p => !teamAPlayerIds.has(p.player_id));
    const teamB_Midfielders = pools.midfielders.filter(p => !teamAPlayerIds.has(p.player_id));
    const teamB_Attackers = pools.attackers.filter(p => !teamAPlayerIds.has(p.player_id));

    // Calculate average stats for each positional unit
    const statsA: PositionalUnitStats = {
        defense: getPositionalUnitStats(teamA_Defenders),
        midfield: getPositionalUnitStats(teamA_Midfielders),
        attack: getPositionalUnitStats(teamA_Attackers),
    };

    const statsB: PositionalUnitStats = {
        defense: getPositionalUnitStats(teamB_Defenders),
        midfield: getPositionalUnitStats(teamB_Midfielders),
        attack: getPositionalUnitStats(teamB_Attackers),
    };
    
    // Create a lookup for weights
    const weightsLookup: Record<string, Record<string, number>> = {};
    weights.forEach(w => {
        if (!weightsLookup[w.position_group]) weightsLookup[w.position_group] = {};
        weightsLookup[w.position_group][w.attribute] = Number(w.weight);
    });

    let totalDifference = 0;

    // Compare positional units and sum weighted differences
    const positionGroups: (keyof PositionalUnitStats)[] = ['defense', 'midfield', 'attack'];
    for (const group of positionGroups) {
        const unitStatsA = statsA[group];
        const unitStatsB = statsB[group];
        const groupWeights = weightsLookup[group] || {};

        for (const attribute in unitStatsA) {
            const weight = groupWeights[attribute] || 1.0;
            const diff = Math.abs(unitStatsA[attribute] - unitStatsB[attribute]);
            totalDifference += diff * weight;
        }
    }

    return totalDifference;
}


// --- MAIN ALGORITHM EXPORT ---

export async function balanceByRating(
  matchId: string, 
  sizes?: { a: number; b: number }, 
  state_version?: number,
  tenantId?: string // Multi-tenant: Accept tenant context
) {
  const matchIdInt = parseInt(matchId, 10);
  if (isNaN(matchIdInt)) {
    throw new Error('Invalid Match ID provided.');
  }

  // === PHASE 1: Authoritative Data Gathering ===
  // Set RLS context for tenant isolation
  if (tenantId) {
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  }
  
  const match = tenantId 
    ? await prisma.upcoming_matches.findUnique({ where: { upcoming_match_id: matchIdInt, tenant_id: tenantId }})
    : await prisma.upcoming_matches.findUnique({ where: { upcoming_match_id: matchIdInt }});
  if (!match) throw new Error(`Match with ID ${matchIdInt} not found.`);
  
  // Use actual sizes if provided, otherwise fall back to original team_size
  const actualSizeA = sizes?.a || match.actual_size_a || match.team_size;
  const actualSizeB = sizes?.b || match.actual_size_b || match.team_size;
  const totalPlayers = actualSizeA + actualSizeB;

  const confirmedPlayerPool = tenantId
    ? await prisma.upcoming_match_players.findMany({ 
        where: { upcoming_match_id: matchIdInt, tenant_id: tenantId },
        select: { player_id: true }
      })
    : await prisma.upcoming_match_players.findMany({ 
        where: { upcoming_match_id: matchIdInt },
        select: { player_id: true }
      });
  const playerIds = confirmedPlayerPool.map(p => p.player_id);

  const players = tenantId
    ? await prisma.players.findMany({ where: { player_id: { in: playerIds }, tenant_id: tenantId } })
    : await prisma.players.findMany({ where: { player_id: { in: playerIds } } });
  const balanceWeights = tenantId
    ? await prisma.team_balance_weights.findMany({ where: { tenant_id: tenantId } })
    : await prisma.team_balance_weights.findMany();
  
  // For uneven teams, we need to use the larger team size for template
  const templateSize = Math.max(actualSizeA, actualSizeB);
  const template = tenantId
    ? await prisma.team_size_templates.findFirst({ where: { team_size: templateSize, tenant_id: tenantId } })
    : await prisma.team_size_templates.findFirst({ where: { team_size: templateSize } });
  
  if (!template) throw new Error(`No team size template found for team size: ${templateSize}`);
  
  if (players.length !== totalPlayers) {
    throw new Error(`Player count mismatch. Expected ${totalPlayers}, got ${players.length}.`);
  }

  // === PHASE 2: Player Suitability Scoring ===
  const weightsByGroup: Record<string, TeamBalanceWeight[]> = {
      defense: balanceWeights.filter(w => w.position_group === 'defense'),
      midfield: balanceWeights.filter(w => w.position_group === 'midfield'),
      attack: balanceWeights.filter(w => w.position_group === 'attack'),
  };
  
  console.log('Balance weights by group:', weightsByGroup);
  
  // Note: We still need players with the raw attributes for pool selection
  // The weighted scoring will be used later in the balance calculation
  const playersWithScores: PlayerWithSuitability[] = players.map(p => {
    const calculateScore = (group: 'defense' | 'midfield' | 'attack'): number => {
      const groupWeights = weightsByGroup[group];
      let totalScore = 0;
      let totalWeight = 0;

      for (const weight of groupWeights) {
        const playerStat = p[weight.attribute as keyof Player] as number | null;
        totalScore += (Number(playerStat) || 0) * Number(weight.weight);
        totalWeight += Number(weight.weight);
      }
      return totalWeight > 0 ? totalScore / totalWeight : 0;
    };

    const scores = {
      ...p,
      defenderScore: calculateScore('defense'),
      midfielderScore: calculateScore('midfield'),
      attackerScore: calculateScore('attack'),
    };
    
    console.log(`${p.name}: defender=${p.defender}, defenderScore=${scores.defenderScore.toFixed(2)}, midfielderScore=${scores.midfielderScore.toFixed(2)}, attackerScore=${scores.attackerScore.toFixed(2)}`);
    
    return scores;
  });

  // === PHASE 3: Positional Draft Pool Assembly ===
  // Use RAW ATTRIBUTES for pool selection, not calculated weighted scores
  let remainingPlayers = [...playersWithScores];
  const pools: PositionalPools = { defenders: [], midfielders: [], attackers: [] };
  
  // 1. Select Defender Pool - sort by RAW defender attribute
  remainingPlayers.sort((a, b) => (b.defender || 0) - (a.defender || 0));
  console.log('Players sorted by RAW defender attribute:', remainingPlayers.map(p => `${p.name}: ${p.defender}`));
  
  // Calculate total defenders needed for both teams based on actual sizes
  const defendersTeamA = Math.round(template.defenders * actualSizeA / templateSize);
  const defendersTeamB = Math.round(template.defenders * actualSizeB / templateSize);
  const totalDefenders = defendersTeamA + defendersTeamB;
  
  pools.defenders = remainingPlayers.slice(0, totalDefenders);
  console.log('Selected defenders:', pools.defenders.map(p => p.name));
  remainingPlayers = remainingPlayers.slice(totalDefenders);
  
  // 2. Select Attacker Pool - sort by RAW goalscoring attribute
  remainingPlayers.sort((a, b) => (b.goalscoring || 0) - (a.goalscoring || 0));
  console.log('Remaining players sorted by RAW goalscoring attribute:', remainingPlayers.map(p => `${p.name}: ${p.goalscoring}`));
  
  // Calculate total attackers needed for both teams based on actual sizes
  const attackersTeamA = Math.round(template.attackers * actualSizeA / templateSize);
  const attackersTeamB = Math.round(template.attackers * actualSizeB / templateSize);
  const totalAttackers = attackersTeamA + attackersTeamB;
  
  pools.attackers = remainingPlayers.slice(0, totalAttackers);
  console.log('Selected attackers:', pools.attackers.map(p => p.name));
  remainingPlayers = remainingPlayers.slice(totalAttackers);
  
  // 3. Select Midfielder Pool (the rest)
  pools.midfielders = remainingPlayers;
  console.log('Selected midfielders:', pools.midfielders.map(p => p.name));
  
  // === PHASE 4: Brute-Force Combination Search ===
  let bestScore = Infinity;
  let bestTeamACombination: BestCombination | null = null;
  
  // Use actual team A sizes for combinations
  const teamA_DefenderCombinations = combinations(pools.defenders, defendersTeamA);
  const teamA_MidfielderCombinations = combinations(pools.midfielders, Math.round(template.midfielders * actualSizeA / templateSize));
  const teamA_AttackerCombinations = combinations(pools.attackers, attackersTeamA);

  for (const teamADefenders of teamA_DefenderCombinations) {
    for (const teamAMidfielders of teamA_MidfielderCombinations) {
      for (const teamAAttackers of teamA_AttackerCombinations) {
        
        const currentTeamACombination: BestCombination = {
            defenders: teamADefenders,
            midfielders: teamAMidfielders,
            attackers: teamAAttackers,
        };

        const score = calculateBalanceScore(currentTeamACombination, pools, template, balanceWeights);

        if (score < bestScore) {
          bestScore = score;
          bestTeamACombination = currentTeamACombination;
        }
      }
    }
  }
  
  if (!bestTeamACombination) {
      throw new Error("Could not determine a best team combination. This should not happen.");
  }

  // === PHASE 5: Atomically Saving the Final Team ===
  // We can assert non-null as we've checked for it after the loop.
  const finalTeamACombination = bestTeamACombination!;

  // Get the players for Team B by finding the remainder in each positional pool.
  const bestTeamAPlayerIds = new Set([
      ...finalTeamACombination.defenders.map(p => p.player_id),
      ...finalTeamACombination.midfielders.map(p => p.player_id),
      ...finalTeamACombination.attackers.map(p => p.player_id)
  ]);
  const teamBDefenders = pools.defenders.filter(p => !bestTeamAPlayerIds.has(p.player_id));
  const teamBMidfielders = pools.midfielders.filter(p => !bestTeamAPlayerIds.has(p.player_id));
  const teamBAttackers = pools.attackers.filter(p => !bestTeamAPlayerIds.has(p.player_id));

  const finalAssignments: FinalAssignment[] = [];

  // --- Corrected Slot Assignment Logic ---
  const assignSlots = (
    players: PlayerWithSuitability[],
    team: 'A' | 'B',
    baseSlot: number,
  ): FinalAssignment[] => {
    return players.map((player, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: player.player_id,
      team,
      slot_number: baseSlot + index,
      tenant_id: tenantId,
    }));
  };

  // Team A Assignments - use 1-N numbering
  let slotCounterA = 1;
  finalAssignments.push(...assignSlots(finalTeamACombination.defenders, 'A', slotCounterA));
  slotCounterA += defendersTeamA;
  finalAssignments.push(...assignSlots(finalTeamACombination.midfielders, 'A', slotCounterA));
  slotCounterA += finalTeamACombination.midfielders.length;
  finalAssignments.push(...assignSlots(finalTeamACombination.attackers, 'A', slotCounterA));

  // Team B Assignments - use 1-N numbering (separate from Team A)
  let slotCounterB = 1;
  finalAssignments.push(...assignSlots(teamBDefenders, 'B', slotCounterB));
  slotCounterB += teamBDefenders.length;
  finalAssignments.push(...assignSlots(teamBMidfielders, 'B', slotCounterB));
  slotCounterB += teamBMidfielders.length;
  finalAssignments.push(...assignSlots(teamBAttackers, 'B', slotCounterB));

  await prisma.$transaction(async (tx) => {
    // Step 1: Delete Old Assignments
    await tx.upcoming_match_players.deleteMany({ where: { upcoming_match_id: matchIdInt, tenant_id: tenantId } });
    
    // Step 2: Create New Assignments
    const finalAssignmentsWithTenant = finalAssignments.map(assignment => ({
      ...assignment,
      tenant_id: tenantId!
    }));
    await tx.upcoming_match_players.createMany({ data: finalAssignmentsWithTenant });

    // Step 3: Update Match State
    await tx.upcoming_matches.update({
      where: { upcoming_match_id: matchIdInt },
      data: { is_balanced: true },
    });
  });

  return { message: "Teams balanced successfully according to specification." };
} 