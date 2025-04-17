import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Player {
  player_id: number;
  name: string;
  defender?: number;
  goalscoring?: number;
  stamina_pace?: number;
  control?: number;
  teamwork?: number;
  resilience?: number;
  slot_number?: number;
}

interface TeamStats {
  defense: {
    stamina_pace: number;
    control: number;
    goalscoring: number;
    teamwork: number;
    resilience: number;
  };
  midfield: {
    control: number;
    stamina_pace: number;
    goalscoring: number;
    teamwork: number;
    resilience: number;
  };
  attack: {
    goalscoring: number;
    stamina_pace: number;
    control: number;
    teamwork: number;
    resilience: number;
  };
}

// Shuffle array randomly
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Calculate position-specific team stats
const calculateTeamStats = (team: Player[]): TeamStats => {
  // Identify positions based on slot numbers
  const isTeamA = (slot?: number) => slot !== undefined && slot <= 9;
  
  const defenders = team.filter(p => {
    if (!p.slot_number) return false;
    return isTeamA(p.slot_number) 
      ? p.slot_number <= 3 
      : (p.slot_number >= 10 && p.slot_number <= 12);
  });
  
  const midfielders = team.filter(p => {
    if (!p.slot_number) return false;
    return isTeamA(p.slot_number)
      ? (p.slot_number >= 4 && p.slot_number <= 7)
      : (p.slot_number >= 13 && p.slot_number <= 16);
  });
  
  const attackers = team.filter(p => {
    if (!p.slot_number) return false;
    return isTeamA(p.slot_number)
      ? (p.slot_number === 8 || p.slot_number === 9)
      : (p.slot_number === 17 || p.slot_number === 18);
  });

  // Calculate average stat with fallback to default value
  const safeAverage = (players: Player[], field: keyof Player, defaultVal = 3) => {
    if (!players.length) return defaultVal;
    return players.reduce((sum, p) => sum + (Number(p[field]) || defaultVal), 0) / players.length;
  };

  return {
    defense: {
      stamina_pace: safeAverage(defenders, 'stamina_pace'),
      control: safeAverage(defenders, 'control'),
      goalscoring: safeAverage(defenders, 'goalscoring'),
      teamwork: safeAverage(defenders, 'teamwork'),
      resilience: safeAverage(defenders, 'resilience')
    },
    midfield: {
      control: safeAverage(midfielders, 'control'),
      stamina_pace: safeAverage(midfielders, 'stamina_pace'),
      goalscoring: safeAverage(midfielders, 'goalscoring'),
      teamwork: safeAverage(midfielders, 'teamwork'),
      resilience: safeAverage(midfielders, 'resilience')
    },
    attack: {
      goalscoring: safeAverage(attackers, 'goalscoring'),
      stamina_pace: safeAverage(attackers, 'stamina_pace'),
      control: safeAverage(attackers, 'control'),
      teamwork: safeAverage(attackers, 'teamwork'),
      resilience: safeAverage(attackers, 'resilience')
    }
  };
};

// Calculate balance score between teams (lower is better)
const calculateBalanceScore = (teamA: Player[], teamB: Player[], weights: any[] = []): number => {
  const statsA = calculateTeamStats(teamA);
  const statsB = calculateTeamStats(teamB);
  
  // Group weights by position group
  const weightsByGroup: Record<string, Record<string, number>> = {};
  weights.forEach(w => {
    if (!weightsByGroup[w.position_group]) {
      weightsByGroup[w.position_group] = {};
    }
    weightsByGroup[w.position_group][w.attribute] = Number(w.weight);
  });
  
  // Default weight if a specific weight is not found
  const defaultWeight = 1.0;
  
  // Function to calculate weighted difference between two stats
  const calculateDifference = (statsA: any, statsB: any, positionGroup: string): number => {
    const groupWeights = weightsByGroup[positionGroup] || {};
    let totalDifference = 0;
    let totalWeightsUsed = 0;
    
    // Calculate weighted difference for each attribute in this position group
    for (const attribute in statsA) {
      const weight = groupWeights[attribute] || defaultWeight;
      totalDifference += Math.abs(statsA[attribute] - statsB[attribute]) * weight;
      totalWeightsUsed += weight;
    }
    
    // Normalize by total weights to get fair comparison between position groups
    return totalWeightsUsed > 0 ? totalDifference / totalWeightsUsed : 0;
  };
  
  // Calculate differences for each position group
  const defenseDiff = calculateDifference(statsA.defense, statsB.defense, 'defense');
  const midfieldDiff = calculateDifference(statsA.midfield, statsB.midfield, 'midfield');
  const attackDiff = calculateDifference(statsA.attack, statsB.attack, 'attack');
  
  // Total score - add all differences (lower is better)
  return defenseDiff + midfieldDiff + attackDiff;
};

// Helper to generate all unique combinations of k elements from a set of n
function combinations<T>(array: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (array.length === 0) return [];
  
  const [first, ...rest] = array;
  const combsWithFirst = combinations(rest, k-1).map(comb => [first, ...comb]);
  const combsWithoutFirst = combinations(rest, k);
  
  return [...combsWithFirst, ...combsWithoutFirst];
}

// POST handler for balancing a planned match
export async function POST(request: Request) {
  try {
    // Get matchId from URL query parameters
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }
    
    const matchIdInt = parseInt(matchId, 10);
    if (isNaN(matchIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid match ID' },
        { status: 400 }
      );
    }
    
    // Initialize variables for optimal team balance
    let bestSlots: { player_id: number, team: string, slot_number: number }[] = [];
    let bestScore = Infinity;
    
    // Get match details
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchIdInt },
      select: {
        upcoming_match_id: true,
        team_size: true,
        is_balanced: true
      }
    });
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }
    
    // Get players from the pool instead of all match players
    console.log('Getting players from the pool...');
    const poolPlayers = await prisma.match_player_pool.findMany({
      where: { 
        upcoming_match_id: matchIdInt,
        response_status: 'IN'  // Only include confirmed players
      },
      include: {
        player: true  // Include player details
      }
    });
    
    // Check if there are enough players in the pool
    if (poolPlayers.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 players are required in the player pool to balance teams' },
        { status: 400 }
      );
    }
    
    // Get balance algorithm weights
    const balanceWeights = await prisma.team_balance_weights.findMany();
    
    // Prepare player data for balancing from the pool only
    const players = poolPlayers.map(p => ({
      player_id: p.player_id,
      name: p.player.name,
      defender: p.player.defender,
      goalscoring: p.player.goalscoring,
      stamina_pace: p.player.stamina_pace,
      control: p.player.control,
      teamwork: p.player.teamwork,
      resilience: p.player.resilience,
      slot_number: 0 // Use 0 instead of null to avoid type issues
    }));
    
    console.log(`Balancing teams with ${players.length} players from the pool`);
    
    // Get team size template for position distribution
    const teamSizeTemplate = await prisma.team_size_templates.findFirst({
      where: { 
        team_size: match.team_size
      }
    });
    
    if (!teamSizeTemplate) {
      console.warn(`No team size template found for ${match.team_size}v${match.team_size}, using defaults`);
    }
    
    // Determine how many of each position per team
    const defendersPerTeam = teamSizeTemplate?.defenders || Math.max(Math.floor(match.team_size / 3), 1);
    const attackersPerTeam = teamSizeTemplate?.attackers || Math.max(Math.floor(match.team_size / 3), 1);
    const midfieldersPerTeam = teamSizeTemplate?.midfielders || (match.team_size - defendersPerTeam - attackersPerTeam);
    
    console.log(`Using position distribution: ${defendersPerTeam} defenders, ${midfieldersPerTeam} midfielders, ${attackersPerTeam} attackers per team`);
    
    // Sort players by position suitability
    const sortedPlayers = [...players];
    
    // Prepare players for each position group
    const playerScores = sortedPlayers.map(player => {
      // Get weights for each position group
      const defenseWeights = balanceWeights.filter(w => w.position_group === 'defense');
      const midfieldWeights = balanceWeights.filter(w => w.position_group === 'midfield');
      const attackWeights = balanceWeights.filter(w => w.position_group === 'attack');
      
      // Calculate position scores using database weights
      const calculatePositionScore = (weights: any[], player: Player) => {
        if (!weights.length) {
          // Default fallback if no weights are configured
          return 3;
        }
        
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const weightConfig of weights) {
          const attribute = weightConfig.attribute;
          const weight = Number(weightConfig.weight);
          
          // Get player attribute value (default to 3 if not set)
          const playerValue = player[attribute as keyof Player] as number || 3;
          
          totalScore += playerValue * weight;
          totalWeight += weight;
        }
        
        return totalWeight > 0 ? totalScore / totalWeight : 3;
      };
      
      // Calculate scores for each position using config-driven approach
      const defenderScore = calculatePositionScore(defenseWeights, player);
      const midfielderScore = calculatePositionScore(midfieldWeights, player);
      const attackerScore = calculatePositionScore(attackWeights, player);
      
      return {
        player,
        defenderScore,
        midfielderScore,
        attackerScore
      };
    });
    
    // Prepare players for each position group - all players are used, no leftovers
    const defenderPlayers = playerScores
      .sort((a, b) => (b.player.defender || 3) - (a.player.defender || 3))
      .slice(0, defendersPerTeam * 2);

    const remainingPlayers = playerScores.filter(p => 
      !defenderPlayers.some(d => d.player.player_id === p.player.player_id)
    );

    const attackerPlayers = remainingPlayers
      .sort((a, b) => (b.player.goalscoring || 3) - (a.player.goalscoring || 3))
      .slice(0, attackersPerTeam * 2);

    const midfielderPlayers = remainingPlayers
      .filter(p => !attackerPlayers.some(a => a.player.player_id === p.player.player_id))
      .sort((a, b) => (b.player.control || 3) - (a.player.control || 3))
      .slice(0, midfieldersPerTeam * 2);

    // Generate all possible combinations for each position group
    const defenderCombinations = combinations(defenderPlayers, defendersPerTeam);
    const attackerCombinations = combinations(attackerPlayers, attackersPerTeam);
    const midfielderCombinations = combinations(midfielderPlayers, midfieldersPerTeam);

    console.log(`Evaluating ${defenderCombinations.length} × ${attackerCombinations.length} × ${midfielderCombinations.length} = ${
      defenderCombinations.length * attackerCombinations.length * midfielderCombinations.length
    } total team combinations`);

    // Track progress for the brute force search
    let totalCombinations = defenderCombinations.length * attackerCombinations.length * midfielderCombinations.length;
    let processedCombinations = 0;
    
    // Find optimal team balance using brute force
    for (const teamADefenders of defenderCombinations) {
      const teamBDefenders = defenderPlayers.filter(p => 
        !teamADefenders.some(d => d.player.player_id === p.player.player_id)
      );
      
      for (const teamAAttackers of attackerCombinations) {
        const teamBAttackers = attackerPlayers.filter(p => 
          !teamAAttackers.some(a => a.player.player_id === p.player.player_id)
        );
        
        for (const teamAMidfielders of midfielderCombinations) {
          const teamBMidfielders = midfielderPlayers.filter(p => 
            !teamAMidfielders.some(m => m.player.player_id === p.player.player_id)
          );
          
          // Update progress periodically
          processedCombinations++;
          
          // Create team assignments for this combination
          const slotAssignments: { player_id: number, team: string, slot_number: number }[] = [];
          
          // Assign defenders
          teamADefenders.forEach((player, index) => {
            slotAssignments.push({
              player_id: player.player.player_id,
              team: 'A',
              slot_number: index + 1 // Team A: slots 1, 2, 3, etc.
            });
          });
          
          teamBDefenders.forEach((player, index) => {
            slotAssignments.push({
              player_id: player.player.player_id,
              team: 'B',
              slot_number: match.team_size + index + 1 // Team B: slots (team_size+1), etc.
            });
          });
          
          // Assign attackers
          const teamAAttackerBaseSlot = defendersPerTeam + midfieldersPerTeam + 1;
          const teamBAttackerBaseSlot = match.team_size + defendersPerTeam + midfieldersPerTeam + 1;
          
          teamAAttackers.forEach((player, index) => {
            slotAssignments.push({
              player_id: player.player.player_id,
              team: 'A',
              slot_number: teamAAttackerBaseSlot + index
            });
          });
          
          teamBAttackers.forEach((player, index) => {
            slotAssignments.push({
              player_id: player.player.player_id,
              team: 'B',
              slot_number: teamBAttackerBaseSlot + index
            });
          });
          
          // Assign midfielders
          const teamAMidfielderBaseSlot = defendersPerTeam + 1;
          const teamBMidfielderBaseSlot = match.team_size + defendersPerTeam + 1;
          
          teamAMidfielders.forEach((player, index) => {
            slotAssignments.push({
              player_id: player.player.player_id,
              team: 'A',
              slot_number: teamAMidfielderBaseSlot + index
            });
          });
          
          teamBMidfielders.forEach((player, index) => {
            slotAssignments.push({
              player_id: player.player.player_id,
              team: 'B',
              slot_number: teamBMidfielderBaseSlot + index
            });
          });
          
          // Evaluate this assignment
          const teamAPlayers = slotAssignments
            .filter(a => a.team === 'A')
            .map(a => {
              const player = players.find(p => p.player_id === a.player_id);
              return { ...player, slot_number: a.slot_number } as Player;
            });
          
          const teamBPlayers = slotAssignments
            .filter(a => a.team === 'B')
            .map(a => {
              const player = players.find(p => p.player_id === a.player_id);
              return { ...player, slot_number: a.slot_number } as Player;
            });
          
          const score = calculateBalanceScore(teamAPlayers, teamBPlayers, balanceWeights);
          
          // Update best score and slots if this is better
          if (score < bestScore) {
            bestScore = score;
            bestSlots = [...slotAssignments];
            
            console.log(`New best score ${score.toFixed(4)} found`);
            console.log(`Team A: ${teamAPlayers.length} players, Team B: ${teamBPlayers.length} players`);
          }
        }
      }
    }
    
    console.log(`Best balance score: ${bestScore.toFixed(4)} with ${bestSlots.length} players assigned`);
    
    if (bestSlots.length === 0) {
      console.error('No valid team balance found! Check algorithm logic.');
      return NextResponse.json(
        { success: false, error: 'Could not find a valid team balance' },
        { status: 500 }
      );
    }
    
    // Final optimization: Try swapping all defender pairs and keep if better
    console.log('Performing final optimization with defender swapping...');
    let optimizationImprovement = false;
    
    // Get all defenders
    const teamADefenders = bestSlots.filter(s => s.team === 'A' && s.slot_number <= 3);
    const teamBDefenders = bestSlots.filter(s => s.team === 'B' && s.slot_number >= 10 && s.slot_number <= 12);
    
    // Try swapping each pair of defenders
    for (const defenderA of teamADefenders) {
      for (const defenderB of teamBDefenders) {
        // Create a copy of best slots
        const testSlots = [...bestSlots];
        
        // Find and modify the two slots we want to swap
        const slotAIndex = testSlots.findIndex(s => s.player_id === defenderA.player_id);
        const slotBIndex = testSlots.findIndex(s => s.player_id === defenderB.player_id);
        
        if (slotAIndex !== -1 && slotBIndex !== -1) {
          // Swap players
          const tempPlayerId = testSlots[slotAIndex].player_id;
          testSlots[slotAIndex].player_id = testSlots[slotBIndex].player_id;
          testSlots[slotBIndex].player_id = tempPlayerId;
          
          // Evaluate this swap
          const testTeamA = testSlots
            .filter(s => s.team === 'A')
            .map(s => {
              const player = players.find(p => p.player_id === s.player_id);
              return { ...player, slot_number: s.slot_number };
            });
            
          const testTeamB = testSlots
            .filter(s => s.team === 'B')
            .map(s => {
              const player = players.find(p => p.player_id === s.player_id);
              return { ...player, slot_number: s.slot_number };
            });
            
          const testScore = calculateBalanceScore(testTeamA, testTeamB, balanceWeights);
          
          // If this swap improves the score, keep it
          if (testScore < bestScore) {
            console.log(`Defender swap improved score from ${bestScore.toFixed(4)} to ${testScore.toFixed(4)}`);
            bestScore = testScore;
            bestSlots = testSlots;
            optimizationImprovement = true;
          }
        }
      }
    }
    
    if (optimizationImprovement) {
      console.log('Final optimization improved the balance!');
    } else {
      console.log('No improvement from final optimization');
    }
    
    console.log('Team balance details after optimization:');
    const finalTeamAPlayers = bestSlots.filter(s => s.team === 'A');
    const finalTeamBPlayers = bestSlots.filter(s => s.team === 'B');
    console.log(`Team A: ${finalTeamAPlayers.length} players`);
    console.log(`Team B: ${finalTeamBPlayers.length} players`);
    
    try {
      // Use a transaction to ensure all changes happen atomically
      await prisma.$transaction(async (tx) => {
        // Step 1: Delete ALL existing player assignments for this match
        console.log('Deleting all existing player assignments...');
        const deleteResult = await tx.upcoming_match_players.deleteMany({
          where: { upcoming_match_id: matchIdInt }
        });
        console.log(`Deleted ${deleteResult.count} existing assignments`);
        
        // Step 2: Create new assignments for balanced teams
        console.log('Creating fresh player assignments...');
        let createdCount = 0;
        
        for (const slot of bestSlots) {
          await tx.upcoming_match_players.create({
            data: {
              upcoming_match_id: matchIdInt,
              player_id: slot.player_id,
              team: slot.team,
              slot_number: slot.slot_number
            }
          });
          createdCount++;
        }
    
        console.log(`Created ${createdCount} new player assignments`);
    
        // Mark match as balanced
        await tx.upcoming_matches.update({
          where: { upcoming_match_id: matchIdInt },
          data: { is_balanced: true }
        });
        console.log('Match marked as balanced');
      });
      
      console.log('Team balancing completed successfully');
    } catch (error) {
      console.error('Error saving balanced teams:', error);
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      slots: bestSlots,
      score: bestScore
    });
    
  } catch (error: any) {
    console.error('Error balancing planned match:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 