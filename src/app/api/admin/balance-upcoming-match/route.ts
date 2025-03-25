import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Player {
  player_id: number;
  name: string;
  join_date: Date | null;
  is_ringer: boolean;
  is_retired: boolean | null;
  goalscoring: number;
  defender: number;
  stamina_pace: number;
  control: number;
  teamwork: number;
  resilience: number | null;
}

interface TeamStats {
  defense: {
    stamina_pace: number;
    control: number;
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

interface Weight {
  position_group: string;
  attribute: string;
  weight: number;
}

// Calculate team stats for balance score
const calculateTeamStats = (players: Array<{ position: string; player: Player }>): TeamStats | null => {
  if (!players || players.length === 0) return null;

  // Group players by position
  const defenders = players.filter(p => p.position === 'defender');
  const midfielders = players.filter(p => p.position === 'midfielder');
  const attackers = players.filter(p => p.position === 'attacker');

  // Calculate average for each attribute by position
  const defenseStats = {
    stamina_pace: defenders.reduce((sum, p) => sum + (p.player.stamina_pace || 3), 0) / (defenders.length || 1),
    control: defenders.reduce((sum, p) => sum + (p.player.control || 3), 0) / (defenders.length || 1)
  };

  const midfieldStats = {
    control: midfielders.reduce((sum, p) => sum + (p.player.control || 3), 0) / (midfielders.length || 1),
    stamina_pace: midfielders.reduce((sum, p) => sum + (p.player.stamina_pace || 3), 0) / (midfielders.length || 1),
    goalscoring: midfielders.reduce((sum, p) => sum + (p.player.goalscoring || 3), 0) / (midfielders.length || 1)
  };

  const attackStats = {
    goalscoring: attackers.reduce((sum, p) => sum + (p.player.goalscoring || 3), 0) / (attackers.length || 1),
    stamina_pace: attackers.reduce((sum, p) => sum + (p.player.stamina_pace || 3), 0) / (attackers.length || 1),
    control: attackers.reduce((sum, p) => sum + (p.player.control || 3), 0) / (attackers.length || 1)
  };

  // Calculate team-wide attributes
  const resilience = players.reduce((sum, p) => sum + (p.player.resilience || 3), 0) / players.length;
  const teamwork = players.reduce((sum, p) => sum + (p.player.teamwork || 3), 0) / players.length;

  return {
    defense: defenseStats,
    midfield: midfieldStats,
    attack: attackStats,
    resilience,
    teamwork
  };
};

// Calculate balance score between two teams based on weights
const calculateBalanceScore = (teamA: Array<{ position: string; player: Player }>, teamB: Array<{ position: string; player: Player }>, weights: Weight[]) => {
  const statsA = calculateTeamStats(teamA);
  const statsB = calculateTeamStats(teamB);

  if (!statsA || !statsB) return 100; // Large imbalance if data is missing

  let totalScore = 0;

  // Group weights by position and attribute
  const weightsByGroup = weights.reduce((acc, w) => {
    if (!acc[w.position_group]) acc[w.position_group] = {};
    acc[w.position_group][w.attribute] = w.weight;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Calculate defense balance
  if (weightsByGroup.defense) {
    let defenseDiff = 0;
    for (const [attr, weight] of Object.entries(weightsByGroup.defense)) {
      defenseDiff += Math.abs(statsA.defense[attr as keyof typeof statsA.defense] - statsB.defense[attr as keyof typeof statsB.defense]) * weight;
    }
    totalScore += defenseDiff;
  }

  // Calculate midfield balance
  if (weightsByGroup.midfield) {
    let midfieldDiff = 0;
    for (const [attr, weight] of Object.entries(weightsByGroup.midfield)) {
      midfieldDiff += Math.abs(statsA.midfield[attr as keyof typeof statsA.midfield] - statsB.midfield[attr as keyof typeof statsB.midfield]) * weight;
    }
    totalScore += midfieldDiff;
  }

  // Calculate attack balance
  if (weightsByGroup.attack) {
    let attackDiff = 0;
    for (const [attr, weight] of Object.entries(weightsByGroup.attack)) {
      attackDiff += Math.abs(statsA.attack[attr as keyof typeof statsA.attack] - statsB.attack[attr as keyof typeof statsB.attack]) * weight;
    }
    totalScore += attackDiff;
  }

  // Calculate team attributes balance
  if (weightsByGroup.team) {
    let teamDiff = 0;
    if (weightsByGroup.team.resilience) {
      teamDiff += Math.abs(statsA.resilience - statsB.resilience) * weightsByGroup.team.resilience;
    }
    if (weightsByGroup.team.teamwork) {
      teamDiff += Math.abs(statsA.teamwork - statsB.teamwork) * weightsByGroup.team.teamwork;
    }
    totalScore += teamDiff;
  }

  return totalScore;
};

// Utility function to shuffle an array
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// POST: Balance teams for an upcoming match
export async function POST(request: Request) {
  try {
    const { matchId, weights } = await request.json() as { matchId: string; weights: Weight[] };

    // Get match details
    const match = await prisma.matches.findUnique({
      where: { match_id: parseInt(matchId) },
      include: {
        player_matches: {
          include: {
            players: true
          }
        }
      }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Group players by team and ensure players are non-null
    const teamA = match.player_matches
      .filter(pm => pm.team === 'A' && pm.players)
      .map(pm => ({
        position: 'midfielder', // Default position since it's not in the schema
        player: pm.players as Player // We know this is non-null due to the filter
      }));

    const teamB = match.player_matches
      .filter(pm => pm.team === 'B' && pm.players)
      .map(pm => ({
        position: 'midfielder', // Default position since it's not in the schema
        player: pm.players as Player // We know this is non-null due to the filter
      }));

    // Calculate balance score
    const balanceScore = calculateBalanceScore(teamA, teamB, weights);

    // Update match with balance score
    await prisma.matches.update({
      where: { match_id: parseInt(matchId) },
      data: {
        team_a_score: balanceScore,
        team_b_score: balanceScore
      }
    });

    return NextResponse.json({ 
      success: true, 
      balanceScore,
      matchId 
    });
  } catch (error) {
    console.error('Error balancing match:', error);
    return NextResponse.json(
      { error: 'Failed to balance match' },
      { status: 500 }
    );
  }
} 