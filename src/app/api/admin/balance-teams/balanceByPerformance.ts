import { prisma } from '@/lib/prisma';
import { balanceByPastPerformance } from '../balance-by-past-performance/utils';

// This logic uses the sophisticated performance algorithm with configurable weights

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
  
  // Fetch performance weights from app config
  const performanceConfigs = await prisma.app_config.findMany({
    where: {
      config_key: {
        in: ['performance_power_weight', 'performance_goal_weight']
      }
    }
  });

  // Convert to expected format (no hardcoded defaults - values should exist in DB)
  const performanceWeights = {
    power_weight: 0.5, // fallback only if DB is missing data
    goal_weight: 0.5   // fallback only if DB is missing data
  };

  performanceConfigs.forEach(config => {
    if (config.config_key === 'performance_power_weight') {
      performanceWeights.power_weight = parseFloat(config.config_value);
    } else if (config.config_key === 'performance_goal_weight') {
      performanceWeights.goal_weight = parseFloat(config.config_value);
    }
  });

  // Warn if we're missing configs (should not happen after setup)
  if (performanceConfigs.length !== 2) {
    console.warn('Missing performance weight configs in database. Expected 2, found:', performanceConfigs.length);
  }

  // Use the sophisticated performance balancing algorithm
  const result = await balanceByPastPerformance(null, playerIdsInt, performanceWeights);

  // Convert to the expected assignment format for database update
  const assignments = [
    ...result.teamA.map((playerId, i) => ({ 
      player_id: playerId, 
      team: 'A', 
      slot_number: i + 1 
    })),
    ...result.teamB.map((playerId, i) => ({ 
      player_id: playerId, 
      team: 'B', 
      slot_number: i + 1 + match.team_size 
    })),
  ];

  // Atomically update the assignments
  await prisma.$transaction([
    prisma.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt },
    }),
    prisma.upcoming_match_players.createMany({
      data: assignments.map(a => ({ ...a, upcoming_match_id: matchIdInt })),
    }),
  ]);

  return { success: true, assignments };
} 