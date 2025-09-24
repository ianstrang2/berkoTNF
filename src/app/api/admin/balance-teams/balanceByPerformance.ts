import { prisma } from '@/lib/prisma';
import { balanceByPastPerformance } from '../balance-by-past-performance/utils';
import { MIN_PLAYERS, MAX_PLAYERS, MIN_TEAM } from '@/utils/teamSplit.util';
// Multi-tenant imports - ensuring team balancing is tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';

// This logic uses the sophisticated performance algorithm with configurable weights

export async function balanceByPerformance(
  matchId: string, 
  playerIds: string[], 
  sizes: { a: number; b: number },
  tenantId: string, // Multi-tenant: Required tenant context
  state_version?: number // For concurrency control
) {
  const matchIdInt = parseInt(matchId, 10);
  const playerIdsInt = playerIds.map(id => parseInt(id, 10));

  // Enhanced validation with proper bounds checking using constants
  const poolSize = playerIdsInt.length;
  if (poolSize < MIN_PLAYERS || poolSize > MAX_PLAYERS) {
    throw new Error(`Invalid player count. Expected ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${poolSize}.`);
  }
  
  if (sizes.a + sizes.b !== poolSize) {
    throw new Error(`Size mismatch. Expected ${sizes.a}+${sizes.b}=${sizes.a + sizes.b}, got ${poolSize}.`);
  }
  
  // Multi-tenant: Use tenant-scoped queries if tenant context provided
  const tenantPrisma = tenantId ? await createTenantPrisma(tenantId) : null;
  
  // Fetch performance weights from app config
  // Multi-tenant: Query scoped to tenant if context available
  const performanceConfigs = tenantPrisma 
    ? await tenantPrisma.app_config.findMany({
        where: {
          config_key: {
            in: ['performance_power_weight', 'performance_goal_weight']
          }
        }
      })
    : await prisma.app_config.findMany({
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
  const result = await balanceByPastPerformance(null, playerIdsInt, performanceWeights, sizes);

  // Convert to assignment format - both teams use 1-N slot numbering
  const assignments = [
    ...result.teamA.slice(0, sizes.a).map((playerId, i) => ({ 
      player_id: playerId, 
      team: 'A', 
      slot_number: i + 1 
    })),
    ...result.teamB.slice(0, sizes.b).map((playerId, i) => ({ 
      player_id: playerId, 
      team: 'B', 
      slot_number: i + 1
    })),
  ];
  
  // Atomically update assignments with concurrency control
  await prisma.$transaction(async (tx) => {
    // Clear and recreate assignments
    await tx.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt, tenant_id: tenantId }
    });
    
    await tx.upcoming_match_players.createMany({
      data: assignments.map(a => ({ ...a, upcoming_match_id: matchIdInt, tenant_id: tenantId }))
    });
    
    // Update match state with concurrency check
    if (state_version !== undefined) {
      const updateResult = await tx.upcoming_matches.updateMany({
        where: { 
          upcoming_match_id: matchIdInt,
          state_version: state_version
        },
        data: { 
          is_balanced: true,
          state_version: { increment: 1 }
        }
      });
      
      if (updateResult.count === 0) {
        throw new Error('CONCURRENCY_CONFLICT');
      }
    } else {
      // Fallback for cases without state_version
      await tx.upcoming_matches.update({
        where: { upcoming_match_id: matchIdInt },
        data: { is_balanced: true }
      });
    }
  });
  
  // Ensure consistent return format matching Random/Ability
  return {
    success: true,
    data: {
      assignments,
      is_balanced: true,
      balanceType: 'performance'
    }
  };
} 