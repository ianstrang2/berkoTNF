import { prisma } from '@/lib/prisma';

// This logic is extracted from the previous balance-by-past-performance route
// and adapted for the consolidated endpoint.

export async function balanceByPerformance(matchId: string, playerIds: string[]) {
  const matchIdInt = parseInt(matchId, 10);
  const playerIdsInt = playerIds.map(id => parseInt(id, 10));

  const match = await prisma.upcoming_matches.findUnique({
    where: { upcoming_match_id: matchIdInt },
    select: { team_size: true },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  const requiredPlayerCount = match.team_size * 2;
  if (playerIdsInt.length < requiredPlayerCount) {
    throw new Error(`Not enough players. Expected ${requiredPlayerCount}, got ${playerIdsInt.length}.`);
  }
  
  // Fetch performance stats for the given players
  const playerStats = await prisma.aggregated_player_power_ratings.findMany({
      where: {
          player_id: { in: playerIdsInt }
      }
  });

  // Sort players by rating
  const sortedPlayers = playerStats.sort((a, b) => b.rating.toNumber() - a.rating.toNumber());

  // Distribute players into teams (snake draft method)
  const teamA: typeof sortedPlayers = [];
  const teamB: typeof sortedPlayers = [];
  sortedPlayers.forEach((player, index) => {
    if (index % 2 === 0) {
      teamA.push(player);
    } else {
      teamB.push(player);
    }
  });

  const assignments = [
    ...teamA.map((p, i) => ({ player_id: p.player_id, team: 'A', slot_number: i + 1 })),
    ...teamB.map((p, i) => ({ player_id: p.player_id, team: 'B', slot_number: i + 1 + match.team_size })),
  ];

  // Atomically update the assignments
  await prisma.$transaction(async (tx) => {
    await tx.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt },
    });
    await tx.upcoming_match_players.createMany({
      data: assignments.map(a => ({ ...a, upcoming_match_id: matchIdInt })),
    });
    await tx.upcoming_matches.update({
      where: { upcoming_match_id: matchIdInt },
      data: { is_balanced: true },
    });
  });

  return { message: "Teams balanced by performance." };
} 