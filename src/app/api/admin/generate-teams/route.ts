import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calculate defender balance score (equal weight between Stamina & Pace and Control)
const calculateDefenderScore = (player: any) => ({
  total: player.defender,
  balance: (player.stamina_pace + player.control) / 2
});

// Calculate attacker balance score (50% Goalscoring, 30% Stamina & Pace, 20% Teamwork)
const calculateAttackerScore = (player: any) => ({
  total: player.goalscoring,
  balance: (player.goalscoring * 0.5) + (player.stamina_pace * 0.3) + (player.teamwork * 0.2)
});

// Calculate midfielder balance score (equal weight between Control, Teamwork, and Stamina & Pace)
const calculateMidfielderScore = (player: any) => 
  (player.control + player.teamwork + player.stamina_pace) / 3;

// Calculate position-specific team stats
const calculateTeamStats = (team: any[]) => {
  const defenders = team.filter(p => {
    const isDefender = p.slot_number <= 3 || (p.slot_number >= 10 && p.slot_number <= 12);
    return isDefender;
  });
  const midfielders = team.filter(p => {
    const isMidfielder = (p.slot_number >= 4 && p.slot_number <= 7) || (p.slot_number >= 13 && p.slot_number <= 16);
    return isMidfielder;
  });
  const attackers = team.filter(p => {
    const isAttacker = (p.slot_number === 8 || p.slot_number === 9) || (p.slot_number === 17 || p.slot_number === 18);
    return isAttacker;
  });

  // Safely calculate average with fallback to 0
  const safeAverage = (players: any[], field: string) => {
    if (!players.length) return 0;
    return players.reduce((sum, p) => sum + (Number(p[field]) || 0), 0) / players.length;
  };

  return {
    defense: {
      rating: safeAverage(defenders, 'defender'),
      stamina_pace: safeAverage(defenders, 'stamina_pace'),
      control: safeAverage(defenders, 'control')
    },
    midfield: {
      control: safeAverage(midfielders, 'control'),
      teamwork: safeAverage(midfielders, 'teamwork'),
      stamina_pace: safeAverage(midfielders, 'stamina_pace')
    },
    attack: {
      goalscoring: safeAverage(attackers, 'goalscoring'),
      stamina_pace: safeAverage(attackers, 'stamina_pace'),
      teamwork: safeAverage(attackers, 'teamwork')
    }
  };
};

// Calculate balance score between two teams
const calculateBalanceScore = (teamA: any[], teamB: any[]) => {
  const statsA = calculateTeamStats(teamA);
  const statsB = calculateTeamStats(teamB);

  // Calculate differences for each position group
  const defenseDiff = 
    Math.abs(statsA.defense.rating - statsB.defense.rating) +
    Math.abs(statsA.defense.stamina_pace - statsB.defense.stamina_pace) +
    Math.abs(statsA.defense.control - statsB.defense.control);

  const midfieldDiff = 
    Math.abs(statsA.midfield.control - statsB.midfield.control) +
    Math.abs(statsA.midfield.teamwork - statsB.midfield.teamwork) +
    Math.abs(statsA.midfield.stamina_pace - statsB.midfield.stamina_pace);

  const attackDiff = 
    Math.abs(statsA.attack.goalscoring - statsB.attack.goalscoring) * 0.5 +
    Math.abs(statsA.attack.stamina_pace - statsB.attack.stamina_pace) * 0.3 +
    Math.abs(statsA.attack.teamwork - statsB.attack.teamwork) * 0.2;

  return defenseDiff + midfieldDiff + attackDiff;
};

// Shuffle array randomly
const shuffleArray = (array: any[]) => {
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
      .map(slot => slot.player_id);

    if (!playerIds.length) {
      return NextResponse.json({ success: false, error: 'No players assigned to slots' });
    }

    // Fetch player details
    const players = await prisma.players.findMany({
      where: {
        player_id: { in: playerIds }
      }
    });

    console.log('Players found:', players.map(p => ({ 
      player_id: p.player_id, 
      name: p.name 
    })));

    if (!players || players.length < 14) {
      return NextResponse.json({ success: false, error: 'Not enough players selected (minimum 14 required)' });
    }

    // First, identify defenders (highest defender scores)
    const potentialDefenders = [...players]
      .sort((a, b) => (b.defender || 0) - (a.defender || 0))
      .slice(0, 6);

    // Identify attackers from remaining players (highest goalscoring)
    const remainingAfterDefenders = players.filter(p => 
      !potentialDefenders.find(d => d.player_id === p.player_id));
    
    const potentialAttackers = [...remainingAfterDefenders]
      .sort((a, b) => (b.goalscoring || 0) - (a.goalscoring || 0))
      .slice(0, 4);

    // Rest are midfielders
    const midfielders = remainingAfterDefenders
      .filter(p => !potentialAttackers.find(a => a.player_id === p.player_id));

    let bestSlots = null;
    let bestScore = Infinity;
    const maxAttempts = 1000;

    // Try different combinations to find the most balanced teams
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slots = Array(18).fill(null);
      
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