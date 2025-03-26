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
  };
  midfield: {
    control: number;
    stamina_pace: number;
    goalscoring: number;
  };
  attack: {
    goalscoring: number;
    stamina_pace: number;
    control: number;
  };
  resilience: number;
  teamwork: number;
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
      goalscoring: safeAverage(defenders, 'goalscoring')
    },
    midfield: {
      control: safeAverage(midfielders, 'control'),
      stamina_pace: safeAverage(midfielders, 'stamina_pace'),
      goalscoring: safeAverage(midfielders, 'goalscoring')
    },
    attack: {
      goalscoring: safeAverage(attackers, 'goalscoring'),
      stamina_pace: safeAverage(attackers, 'stamina_pace'),
      control: safeAverage(attackers, 'control')
    },
    resilience: safeAverage([...defenders, ...midfielders, ...attackers], 'resilience'),
    teamwork: safeAverage([...defenders, ...midfielders, ...attackers], 'teamwork')
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
  
  // Team-wide differences
  const resilienceDiff = Math.abs(statsA.resilience - statsB.resilience) * 
    ((weightsByGroup.team?.resilience) || defaultWeight);
  const teamworkDiff = Math.abs(statsA.teamwork - statsB.teamwork) * 
    ((weightsByGroup.team?.teamwork) || defaultWeight);
  
  // Total score - add all differences (lower is better)
  return defenseDiff + midfieldDiff + attackDiff + resilienceDiff + teamworkDiff;
};

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
    
    // Get match details
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchIdInt },
      select: {
        upcoming_match_id: true,
        team_size: true,
        is_balanced: true,
        players: {
          include: {
            player: true
          }
        }
      }
    });
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }
    
    // Check if there are enough players assigned
    const assignedPlayerCount = match.players.length;
    if (assignedPlayerCount < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 players are required to balance teams' },
        { status: 400 }
      );
    }
    
    // Get balance algorithm weights
    const balanceWeights = await prisma.team_balance_weights.findMany();
    
    // Prepare player data for balancing
    const players = match.players.map(p => ({
      player_id: p.player_id,
      name: p.player.name,
      defender: p.player.defender,
      goalscoring: p.player.goalscoring,
      stamina_pace: p.player.stamina_pace,
      control: p.player.control,
      teamwork: p.player.teamwork,
      resilience: p.player.resilience,
      slot_number: p.slot_number
    }));
    
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
    
    // Score players for each position
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
    
    // Find optimal team balance
    let bestSlots: { player_id: number, team: string, slot_number: number }[] = [];
    let bestScore = Infinity;
    const maxAttempts = 8400; // Updated to match specification in planned_match_guide.md
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Progress logging
      if (attempt % 100 === 0) {
        console.log(`Balance attempt ${attempt}/${maxAttempts} (best score: ${bestScore.toFixed(3)})`);
      }
      
      // Initialize an empty slots assignments array for this attempt
      const slotAssignments: { player_id: number, team: string, slot_number: number }[] = [];
      
      // Available players for this attempt (clone to avoid modifying the original)
      let availablePlayers = [...playerScores];
      
      // Track assigned player IDs
      const assignedPlayerIds = new Set<number>();
      
      // STEP 1: DEFENDERS FIRST
      console.log(`Selecting ${defendersPerTeam * 2} defenders from ${availablePlayers.length} players`);
      
      // Sort ALL players by raw defender attribute values (highest to lowest)
      // This follows the specification in planned_match_guide.md
      availablePlayers.sort((a, b) => {
        // Primary sort by raw defender attribute
        const defenderDiff = (b.player.defender || 3) - (a.player.defender || 3);
        
        // If defender ratings are very close (essentially tied), use secondary factors
        if (Math.abs(defenderDiff) < 0.1) {
          // Secondary sort by raw control attribute
          const controlDiff = (b.player.control || 3) - (a.player.control || 3);
          
          if (Math.abs(controlDiff) > 0.1) return controlDiff;
          
          // Tertiary sort by raw stamina_pace attribute
          const staminaDiff = (b.player.stamina_pace || 3) - (a.player.stamina_pace || 3);
          
          if (Math.abs(staminaDiff) > 0.1) return staminaDiff;
        }
        
        // Default to primary sort if no ties or no secondary factors helped
        return defenderDiff;
      });
      
      // Select the top N defenders needed for both teams
      const defenderCount = defendersPerTeam * 2;
      const selectedDefenders = availablePlayers.slice(0, defenderCount);
      
      console.log(`Selected top ${selectedDefenders.length} defenders`);
      
      // Distribute defenders alternately between teams
      selectedDefenders.forEach((player, index) => {
        const isTeamA = index % 2 === 0;
        const team = isTeamA ? 'A' : 'B';
        
        // Calculate slot number based on team and position index
        const positionIndex = Math.floor(index / 2); // 0, 0, 1, 1, 2, 2, etc.
        const slotNumber = isTeamA 
          ? positionIndex + 1 // Team A: slots 1, 2, 3, etc.
          : match.team_size + positionIndex + 1; // Team B: slots (team_size+1), (team_size+2), etc.
        
        slotAssignments.push({
          player_id: player.player.player_id,
          team,
          slot_number: slotNumber
        });
        
        // Mark player as assigned
        assignedPlayerIds.add(player.player.player_id);
      });
      
      // STEP 2: ATTACKERS SECOND
      // Filter out already assigned defenders
      availablePlayers = availablePlayers.filter(p => !assignedPlayerIds.has(p.player.player_id));
      
      console.log(`Selecting ${attackersPerTeam * 2} attackers from ${availablePlayers.length} remaining players`);
      
      // Sort REMAINING players by raw goalscoring attribute (highest to lowest)
      // This follows the specification in planned_match_guide.md
      availablePlayers.sort((a, b) => {
        // Primary sort by raw goalscoring attribute
        const goalscoringDiff = (b.player.goalscoring || 3) - (a.player.goalscoring || 3);
        
        // If goalscoring ratings are very close (essentially tied), use secondary factors
        if (Math.abs(goalscoringDiff) < 0.1) {
          // Secondary sort by raw stamina_pace attribute
          const staminaDiff = (b.player.stamina_pace || 3) - (a.player.stamina_pace || 3);
          
          if (Math.abs(staminaDiff) > 0.1) return staminaDiff;
          
          // Tertiary sort by raw control attribute
          const controlDiff = (b.player.control || 3) - (a.player.control || 3);
          
          if (Math.abs(controlDiff) > 0.1) return controlDiff;
        }
        
        // Default to primary sort if no ties or no secondary factors helped
        return goalscoringDiff;
      });
      
      // Select the top N attackers needed for both teams
      const attackerCount = attackersPerTeam * 2;
      const selectedAttackers = availablePlayers.slice(0, attackerCount);
      
      console.log(`Selected top ${selectedAttackers.length} attackers`);
      
      // Calculate attacker slot base positions
      const teamAAttackerBaseSlot = defendersPerTeam + midfieldersPerTeam + 1;
      const teamBAttackerBaseSlot = match.team_size + defendersPerTeam + midfieldersPerTeam + 1;
      
      // Distribute attackers alternately between teams
      selectedAttackers.forEach((player, index) => {
        const isTeamA = index % 2 === 0;
        const team = isTeamA ? 'A' : 'B';
        
        // Calculate slot number based on team and position index
        const positionIndex = Math.floor(index / 2); // 0, 0, 1, 1, etc.
        const slotNumber = isTeamA 
          ? teamAAttackerBaseSlot + positionIndex // Team A attacker slots
          : teamBAttackerBaseSlot + positionIndex; // Team B attacker slots
        
        slotAssignments.push({
          player_id: player.player.player_id,
          team,
          slot_number: slotNumber
        });
        
        // Mark player as assigned
        assignedPlayerIds.add(player.player.player_id);
      });
      
      // STEP 3: MIDFIELDERS LAST
      // Filter out already assigned players
      availablePlayers = availablePlayers.filter(p => !assignedPlayerIds.has(p.player.player_id));
      
      console.log(`Selecting ${midfieldersPerTeam * 2} midfielders from ${availablePlayers.length} remaining players`);
      
      // Sort REMAINING players by raw control attribute (highest to lowest)
      // This follows the specification in planned_match_guide.md
      availablePlayers.sort((a, b) => {
        // Primary sort by raw control attribute
        const controlDiff = (b.player.control || 3) - (a.player.control || 3);
        
        // If control ratings are very close (essentially tied), use secondary factors
        if (Math.abs(controlDiff) < 0.1) {
          // Secondary sort by raw stamina_pace attribute
          const staminaDiff = (b.player.stamina_pace || 3) - (a.player.stamina_pace || 3);
          
          if (Math.abs(staminaDiff) > 0.1) return staminaDiff;
          
          // Tertiary sort by raw teamwork attribute
          const teamworkDiff = (b.player.teamwork || 3) - (a.player.teamwork || 3);
          
          if (Math.abs(teamworkDiff) > 0.1) return teamworkDiff;
        }
        
        // Default to primary sort if no ties or no secondary factors helped
        return controlDiff;
      });
      
      // Select the top N midfielders needed for both teams
      const midfielderCount = midfieldersPerTeam * 2;
      const selectedMidfielders = availablePlayers.slice(0, midfielderCount);
      
      console.log(`Selected top ${selectedMidfielders.length} midfielders`);
      
      // Calculate midfielder slot base positions
      const teamAMidfielderBaseSlot = defendersPerTeam + 1;
      const teamBMidfielderBaseSlot = match.team_size + defendersPerTeam + 1;
      
      // Distribute midfielders alternately between teams
      selectedMidfielders.forEach((player, index) => {
        const isTeamA = index % 2 === 0;
        const team = isTeamA ? 'A' : 'B';
        
        // Calculate slot number based on team and position index
        const positionIndex = Math.floor(index / 2); // 0, 0, 1, 1, etc.
        const slotNumber = isTeamA 
          ? teamAMidfielderBaseSlot + positionIndex // Team A midfielder slots
          : teamBMidfielderBaseSlot + positionIndex; // Team B midfielder slots
        
        slotAssignments.push({
          player_id: player.player.player_id,
          team,
          slot_number: slotNumber
        });
        
        // Mark player as assigned
        assignedPlayerIds.add(player.player.player_id);
      });
      
      // STEP 4: HANDLE ANY UNASSIGNED PLAYERS (if any)
      // Check if there are any unassigned players
      const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.player_id));
      
      if (unassignedPlayers.length > 0) {
        console.log(`Distributing ${unassignedPlayers.length} remaining unassigned players`);
        
        // Find open slots for each team
        const teamAOpenSlots: number[] = [];
        const teamBOpenSlots: number[] = [];
        
        for (let i = 1; i <= match.team_size; i++) {
          if (!slotAssignments.some(a => a.slot_number === i)) {
            teamAOpenSlots.push(i);
          }
        }
        
        for (let i = match.team_size + 1; i <= 2 * match.team_size; i++) {
          if (!slotAssignments.some(a => a.slot_number === i)) {
            teamBOpenSlots.push(i);
          }
        }
        
        // Distribute unassigned players evenly between teams
        shuffleArray(unassignedPlayers).forEach((player: Player, index) => {
          const isTeamA = index % 2 === 0;
          const team = isTeamA ? 'A' : 'B';
          const openSlots = isTeamA ? teamAOpenSlots : teamBOpenSlots;
          
          if (openSlots.length > 0) {
            const slotNumber = openSlots.shift() as number;
            
            slotAssignments.push({
              player_id: player.player_id,
              team,
              slot_number: slotNumber
            });
          }
        });
      }
      
      // STEP 5: Evaluate this assignment
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
        
        // If score is very good, we can stop early
        if (score < 0.05) break;
      }
      
      // For variety in future attempts, shuffle players periodically
      if (attempt % 50 === 0) {
        shuffleArray(playerScores);
      }
    }
    
    console.log(`Best balance score: ${bestScore.toFixed(4)} with ${bestSlots.length} players assigned`);
    
    // Update player assignments in database
    const updatePromises = bestSlots.map(slot => 
      prisma.upcoming_match_players.updateMany({
        where: {
          upcoming_match_id: matchIdInt,
          player_id: slot.player_id
        },
        data: {
          team: slot.team,
          slot_number: slot.slot_number
        }
      })
    );
    
    await Promise.all(updatePromises);
    
    // Mark match as balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: matchIdInt },
      data: { is_balanced: true }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        is_balanced: true,
        balance_score: bestScore,
        player_count: bestSlots.length
      }
    });
    
  } catch (error: any) {
    console.error('Error balancing planned match:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 