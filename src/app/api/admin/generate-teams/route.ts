import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Player {
  player_id: number;
  name: string;
  join_date: Date | null;
  is_ringer: boolean;
  is_retired: boolean | null;
  stamina_pace: number | null;
  control: number | null;
  goalscoring: number | null;
  teamwork: number | null;
  resilience: number | null;
  slot_number?: number;
}

interface TeamStats {
  defense: {
    stamina_pace: number;
    control: number;
  };
  midfield: {
    control: number;
    teamwork: number;
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

// Calculate defender balance score (equal weight between Stamina & Pace, Control, and Resilience)
const calculateDefenderScore = (player: Player) => ({
  total: ((player.stamina_pace || 0) + (player.control || 0) + (player.resilience || 0)) / 3,
  balance: ((player.stamina_pace || 0) + (player.control || 0)) / 2
});

// Calculate attacker balance score (50% Goalscoring, 30% Stamina & Pace, 20% Teamwork)
const calculateAttackerScore = (player: Player) => ({
  total: player.goalscoring || 0,
  balance: (player.goalscoring || 0) * 0.5 + (player.stamina_pace || 0) * 0.3 + (player.teamwork || 0) * 0.2
});

// Calculate midfielder balance score (equal weight between Control, Teamwork, and Stamina & Pace)
const calculateMidfielderScore = (player: Player) => 
  ((player.control || 0) + (player.teamwork || 0) + (player.stamina_pace || 0)) / 3;

// Calculate position-specific team stats
const calculateTeamStats = (team: Player[]): TeamStats => {
  const defenders = team.filter(p => {
    const isDefender = p.slot_number && (p.slot_number <= 3 || (p.slot_number >= 10 && p.slot_number <= 12));
    return isDefender;
  });
  const midfielders = team.filter(p => {
    const isMidfielder = p.slot_number && ((p.slot_number >= 4 && p.slot_number <= 7) || (p.slot_number >= 13 && p.slot_number <= 16));
    return isMidfielder;
  });
  const attackers = team.filter(p => {
    const isAttacker = p.slot_number && ((p.slot_number === 8 || p.slot_number === 9) || (p.slot_number === 17 || p.slot_number === 18));
    return isAttacker;
  });

  // Safely calculate average with fallback to 0
  const safeAverage = (players: Player[], field: keyof Player) => {
    if (!players.length) return 0;
    const values = players.map(p => {
      const value = p[field];
      return typeof value === 'number' ? value : 0;
    });
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  return {
    defense: {
      stamina_pace: safeAverage(defenders, 'stamina_pace'),
      control: safeAverage(defenders, 'control')
    },
    midfield: {
      control: safeAverage(midfielders, 'control'),
      teamwork: safeAverage(midfielders, 'teamwork'),
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

// Calculate balance score between two teams
const calculateBalanceScore = (teamA: (Player | null)[], teamB: (Player | null)[]): number => {
  const statsA = calculateTeamStats(teamA.filter((p): p is Player => p !== null));
  const statsB = calculateTeamStats(teamB.filter((p): p is Player => p !== null));

  // Calculate differences for each position group
  // Defense: 50% Stamina & Pace, 50% Control
  const defenseDiff = 
    Math.abs(statsA.defense.stamina_pace - statsB.defense.stamina_pace) * 0.5 +
    Math.abs(statsA.defense.control - statsB.defense.control) * 0.5;

  // Midfield: 33.33% each for Control, Stamina & Pace, and Goalscoring
  const midfieldDiff = 
    Math.abs(statsA.midfield.control - statsB.midfield.control) * 0.333 +
    Math.abs(statsA.midfield.stamina_pace - statsB.midfield.stamina_pace) * 0.333 +
    Math.abs(statsA.midfield.goalscoring - statsB.midfield.goalscoring) * 0.334;

  // Attack: 50% Goalscoring, 25% Stamina & Pace, 25% Control
  const attackDiff = 
    Math.abs(statsA.attack.goalscoring - statsB.attack.goalscoring) * 0.5 +
    Math.abs(statsA.attack.stamina_pace - statsB.attack.stamina_pace) * 0.25 +
    Math.abs(statsA.attack.control - statsB.attack.control) * 0.25;

  // Team Resilience: 20% weight (since it's a team-wide attribute)
  const resilienceDiff = Math.abs(statsA.resilience - statsB.resilience) * 0.2;

  // Team Teamwork: 20% weight (since it's a team-wide attribute)
  const teamworkDiff = Math.abs(statsA.teamwork - statsB.teamwork) * 0.2;

  return defenseDiff + midfieldDiff + attackDiff + resilienceDiff + teamworkDiff;
};

// Shuffle array randomly
const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export async function POST(request: Request) {
  try {
    // Get current slot assignments and create any missing slots
    const currentSlots = await prisma.team_slots.findMany({
      include: { player: true },
      orderBy: { slot_number: 'asc' }
    });

    console.log('Current slots:', currentSlots.map(s => ({ 
      slot_number: s.slot_number, 
      player_id: s.player_id 
    })));

    // Get all assigned player IDs
    const playerIds = currentSlots
      .filter(slot => slot.player_id !== null)
      .map(slot => slot.player_id as number);

    if (playerIds.length !== 18) {
      return NextResponse.json({ 
        success: false, 
        error: `Exactly 18 players required (currently have ${playerIds.length})` 
      });
    }

    // Fetch player details
    const players = await prisma.players.findMany({
      where: {
        player_id: { in: playerIds }
      }
    }) as unknown as Player[];  // Cast to our Player interface since we know the shape matches

    console.log('Players found:', players.map(p => ({ 
      player_id: p.player_id, 
      name: p.name 
    })));

    if (players.length !== 18) {
      return NextResponse.json({ 
        success: false, 
        error: 'Some selected players not found in database' 
      });
    }

    // Sort players by their defensive attributes (stamina_pace, control, resilience)
    const defenderScore = (p: Player) => ((p.stamina_pace || 0) + (p.control || 0) + (p.resilience || 0)) / 3;
    const sortedDefenders = players.sort((a, b) => defenderScore(b) - defenderScore(a));

    // First, identify defenders (highest defender scores)
    const potentialDefenders = sortedDefenders.slice(0, 6);

    // Identify attackers from remaining players (highest goalscoring)
    const remainingAfterDefenders = players.filter(p => 
      !potentialDefenders.find(d => d.player_id === p.player_id));
    
    const potentialAttackers = remainingAfterDefenders
      .sort((a, b) => (b.goalscoring || 0) - (a.goalscoring || 0))
      .slice(0, 4);

    // Rest are midfielders
    const midfielders = remainingAfterDefenders
      .filter(p => !potentialAttackers.find(a => a.player_id === p.player_id));

    let bestSlots: { slot_number: number; player_id: number | null }[] | null = null;
    let bestScore = Infinity;
    const maxAttempts = 8400;

    // Try different combinations to find the most balanced teams
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Calculate and send progress update every 100 attempts
      if (attempt % 100 === 0) {
        const progress = Math.round((attempt / maxAttempts) * 100);
        console.log(`Progress: ${progress}%`);
      }

      const slots: (Player | null)[] = Array(18).fill(null);
      
      // Distribute defenders to slots 1-3 and 10-12
      const shuffledDefenders = shuffleArray([...potentialDefenders]);
      shuffledDefenders.forEach((defender, index) => {
        // First 3 defenders go to slots 0-2 (will be slots 1-3)
        // Last 3 defenders go to slots 9-11 (will be slots 10-12)
        const slotIndex = index < 3 ? index : 9 + (index - 3);
        slots[slotIndex] = { ...defender, slot_number: slotIndex + 1 };
      });

      // Distribute midfielders to slots 4-7 and 13-16
      const shuffledMidfielders = shuffleArray([...midfielders]);
      shuffledMidfielders.forEach((midfielder, index) => {
        // First 4 midfielders go to slots 3-6 (will be slots 4-7)
        // Last 4 midfielders go to slots 12-15 (will be slots 13-16)
        const slotIndex = index < 4 ? 3 + index : 12 + (index - 4);
        slots[slotIndex] = { ...midfielder, slot_number: slotIndex + 1 };
      });

      // Distribute attackers to slots 8-9 and 17-18
      const shuffledAttackers = shuffleArray([...potentialAttackers]);
      shuffledAttackers.forEach((attacker, index) => {
        // First 2 attackers go to slots 7-8 (will be slots 8-9)
        // Last 2 attackers go to slots 16-17 (will be slots 17-18)
        const slotIndex = index < 2 ? 7 + index : 16 + (index - 2);
        slots[slotIndex] = { ...attacker, slot_number: slotIndex + 1 };
      });

      // Calculate balance score for this combination
      const teamA = slots.slice(0, 9).filter(Boolean);
      const teamB = slots.slice(9).filter(Boolean);
      const score = calculateBalanceScore(teamA, teamB);

      // Update best slots if this combination is better
      if (score < bestScore) {
        bestScore = score;
        bestSlots = slots.map((player, index) => ({
          slot_number: index + 1,
          player_id: player?.player_id || null
        }));
      }

      // If we find a very good balance, we can stop early
      if (score < 0.1) break;
    }

    if (!bestSlots) {
      return NextResponse.json({ success: false, error: 'Failed to generate balanced teams' });
    }

    console.log('Best slots to update:', bestSlots);

    // Update all slots in a transaction
    await prisma.$transaction(
      bestSlots.map(slot => {
        // Find the current slot to get its ID
        const currentSlot = currentSlots.find(s => s.slot_number === slot.slot_number);
        if (!currentSlot) {
          throw new Error(`Slot ${slot.slot_number} not found`);
        }
        return prisma.team_slots.update({
          where: { 
            id: currentSlot.id
          },
          data: { 
            player_id: slot.player_id,
            updated_at: new Date()
          }
        });
      })
    );

    // Return the final slot assignments with player details
    const finalSlots = await prisma.team_slots.findMany({
      orderBy: { slot_number: 'asc' },
      include: { player: true }
    });

    return NextResponse.json({ 
      success: true,
      data: finalSlots
    });
  } catch (error) {
    console.error('Error generating teams:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
} 