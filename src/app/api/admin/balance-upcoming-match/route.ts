import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calculate team stats for balance score
const calculateTeamStats = (players) => {
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
const calculateBalanceScore = (teamA, teamB, weights) => {
  const statsA = calculateTeamStats(teamA);
  const statsB = calculateTeamStats(teamB);

  if (!statsA || !statsB) return 100; // Large imbalance if data is missing

  let totalScore = 0;

  // Group weights by position and attribute
  const weightsByGroup = weights.reduce((acc, w) => {
    if (!acc[w.position_group]) acc[w.position_group] = {};
    acc[w.position_group][w.attribute] = w.weight;
    return acc;
  }, {});

  // Calculate defense balance
  if (weightsByGroup.defense) {
    let defenseDiff = 0;
    for (const [attr, weight] of Object.entries(weightsByGroup.defense)) {
      defenseDiff += Math.abs(statsA.defense[attr] - statsB.defense[attr]) * weight;
    }
    totalScore += defenseDiff;
  }

  // Calculate midfield balance
  if (weightsByGroup.midfield) {
    let midfieldDiff = 0;
    for (const [attr, weight] of Object.entries(weightsByGroup.midfield)) {
      midfieldDiff += Math.abs(statsA.midfield[attr] - statsB.midfield[attr]) * weight;
    }
    totalScore += midfieldDiff;
  }

  // Calculate attack balance
  if (weightsByGroup.attack) {
    let attackDiff = 0;
    for (const [attr, weight] of Object.entries(weightsByGroup.attack)) {
      attackDiff += Math.abs(statsA.attack[attr] - statsB.attack[attr]) * weight;
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
    const body = await request.json();
    
    // Validate required fields
    if (!body.upcoming_match_id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Get match details
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: body.upcoming_match_id }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Get players for this match with their attributes
    const players = await prisma.upcoming_match_players.findMany({
      where: { upcoming_match_id: body.upcoming_match_id },
      include: {
        player: {
          select: {
            player_id: true,
            name: true,
            goalscoring: true,
            defender: true,
            stamina_pace: true,
            control: true,
            teamwork: true,
            resilience: true
          }
        }
      }
    });

    if (players.length === 0) {
      return NextResponse.json({ error: 'No players assigned to this match' }, { status: 400 });
    }

    // Get default template for this team size
    const template = await prisma.team_size_templates.findFirst({
      where: {
        team_size: match.team_size,
        is_default: true
      }
    });

    if (!template) {
      return NextResponse.json({ error: `No default template found for ${match.team_size}-a-side` }, { status: 400 });
    }

    // Get balance weights for this template
    const balanceWeights = await prisma.team_balance_weights.findMany({
      where: { template_id: template.template_id }
    });

    if (balanceWeights.length === 0) {
      return NextResponse.json({ error: 'No balance weights found for the template' }, { status: 400 });
    }

    // Define positions needed for each team based on template
    const positionsNeeded = {
      defenders: template.defenders_per_team,
      midfielders: template.midfielders_per_team,
      attackers: template.attackers_per_team
    };

    // Initial categorization of players based on attributes
    const allPlayers = players.map(p => ({
      ...p,
      player_id: p.player.player_id,
      defenderScore: p.player.defender || 3,
      goalscoreScore: p.player.goalscoring || 3,
      controlScore: p.player.control || 3,
      staminaPaceScore: p.player.stamina_pace || 3,
      teamworkScore: p.player.teamwork || 3,
      resilienceScore: p.player.resilience || 3
    }));

    // Sort players by their defender score (descending)
    const sortedByDefender = [...allPlayers].sort((a, b) => b.defenderScore - a.defenderScore);
    
    // Top N players with highest defender scores become defenders
    const totalDefenders = positionsNeeded.defenders * 2;
    const potentialDefenders = sortedByDefender.slice(0, totalDefenders);
    
    // From remaining players, sort by goalscoring score (descending)
    const remainingAfterDefenders = sortedByDefender.slice(totalDefenders);
    const sortedByGoalscoring = [...remainingAfterDefenders].sort((a, b) => b.goalscoreScore - a.goalscoreScore);
    
    // Top N players with highest goalscoring scores become attackers
    const totalAttackers = positionsNeeded.attackers * 2;
    const potentialAttackers = sortedByGoalscoring.slice(0, totalAttackers);
    
    // Remaining players become midfielders
    const midfielders = sortedByGoalscoring.slice(totalAttackers);

    // Balance Logic: Try different combinations to find the best balanced teams
    const maxAttempts = 2000;
    let bestScore = Number.MAX_VALUE;
    let bestTeamA = [];
    let bestTeamB = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Shuffle players in each position group
      const shuffledDefenders = shuffleArray(potentialDefenders);
      const shuffledMidfielders = shuffleArray(midfielders);
      const shuffledAttackers = shuffleArray(potentialAttackers);

      // Assign defenders
      const defendersA = shuffledDefenders.slice(0, positionsNeeded.defenders);
      const defendersB = shuffledDefenders.slice(positionsNeeded.defenders, positionsNeeded.defenders * 2);

      // Assign midfielders
      const midfieldersA = shuffledMidfielders.slice(0, positionsNeeded.midfielders);
      const midfieldersB = shuffledMidfielders.slice(positionsNeeded.midfielders, positionsNeeded.midfielders * 2);

      // Assign attackers
      const attackersA = shuffledAttackers.slice(0, positionsNeeded.attackers);
      const attackersB = shuffledAttackers.slice(positionsNeeded.attackers, positionsNeeded.attackers * 2);

      // Create teams
      const teamA = [
        ...defendersA.map(p => ({ ...p, position: 'defender', team: 'A' })),
        ...midfieldersA.map(p => ({ ...p, position: 'midfielder', team: 'A' })),
        ...attackersA.map(p => ({ ...p, position: 'attacker', team: 'A' }))
      ];

      const teamB = [
        ...defendersB.map(p => ({ ...p, position: 'defender', team: 'B' })),
        ...midfieldersB.map(p => ({ ...p, position: 'midfielder', team: 'B' })),
        ...attackersB.map(p => ({ ...p, position: 'attacker', team: 'B' }))
      ];

      // Calculate balance score for this distribution
      const score = calculateBalanceScore(teamA, teamB, balanceWeights);

      // Update best teams if this distribution is better
      if (score < bestScore) {
        bestScore = score;
        bestTeamA = teamA;
        bestTeamB = teamB;
      }
    }

    // Combine teams and assign slot numbers
    let slotNumber = 1;
    const finalTeamA = bestTeamA.map(player => {
      const slot = slotNumber++;
      return {
        ...player,
        slot_number: slot
      };
    });

    const finalTeamB = bestTeamB.map(player => {
      const slot = slotNumber++;
      return {
        ...player,
        slot_number: slot
      };
    });

    const finalAssignments = [...finalTeamA, ...finalTeamB];

    // Update player assignments in the database
    await prisma.$transaction(
      finalAssignments.map(assignment => 
        prisma.upcoming_match_players.update({
          where: { upcoming_player_id: assignment.upcoming_player_id },
          data: {
            team: assignment.team,
            position: assignment.position,
            slot_number: assignment.slot_number,
            updated_at: new Date()
          }
        })
      )
    );

    // Mark match as balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: body.upcoming_match_id },
      data: { 
        is_balanced: true,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        teamA: finalTeamA,
        teamB: finalTeamB,
        balanceScore: bestScore
      }
    });
  } catch (error) {
    console.error('Error balancing teams:', error);
    return NextResponse.json({ error: 'Failed to balance teams' }, { status: 500 });
  }
} 