import { prisma } from '@/lib/prisma';
import { MIN_PLAYERS, MAX_PLAYERS } from '@/utils/teamSplit.util';

// Seeded random number generator for reproducible testing
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with optional seeding
function shuffle(ids: number[], seedStr?: string): number[] {
  const rnd = seedStr 
    ? mulberry32([...seedStr].reduce((a, c) => a + c.charCodeAt(0), 0))
    : Math.random;
  
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function randomBalance(
  matchId: number,
  playerIds: number[], 
  sizes: { a: number; b: number },
  seed?: string,
  state_version?: number
) {
  const matchIdInt = matchId;
  
  // Enhanced validation with proper bounds checking using constants
  const poolSize = playerIds.length;
  if (poolSize < MIN_PLAYERS || poolSize > MAX_PLAYERS) {
    throw new Error(`Invalid player count. Expected ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${poolSize}.`);
  }
  
  if (sizes.a + sizes.b !== poolSize) {
    throw new Error(`Size mismatch. Expected ${sizes.a}+${sizes.b}=${sizes.a + sizes.b}, got ${poolSize}.`);
  }
  
  // Proper Fisher-Yates shuffle with optional seeding
  const shuffledIds = shuffle(playerIds, seed);
  
  // Split by team sizes
  const teamAPlayerIds = shuffledIds.slice(0, sizes.a);
  const teamBPlayerIds = shuffledIds.slice(sizes.a);
  
  const assignments = [
    ...teamAPlayerIds.map((playerId, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: playerId,
      team: 'A' as const,
      slot_number: index + 1,
    })),
    ...teamBPlayerIds.map((playerId, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: playerId,
      team: 'B' as const,
      slot_number: index + 1,
    }))
  ];

  // Transactional write with concurrency control
  return await prisma.$transaction(async (tx) => {
    // Clear existing assignments for this match
    await tx.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt }
    });

    // Insert new assignments
    await tx.upcoming_match_players.createMany({
      data: assignments
    });

    // Update match state with concurrency control
    const updateData: any = {
      is_balanced: true,
      balance_type: 'random',
      state_version: { increment: 1 },
    };

    // Include state_version check if provided
    const whereClause: any = { upcoming_match_id: matchIdInt };
    if (state_version !== undefined) {
      whereClause.state_version = state_version;
    }

    const updatedMatch = await tx.upcoming_matches.updateMany({
      where: whereClause,
      data: updateData,
    });

    // Check for concurrency conflict
    if (updatedMatch.count === 0) {
      throw new Error('CONCURRENCY_CONFLICT');
    }

    return {
      success: true,
      data: {
        assignments,
        is_balanced: true,
        balanceType: 'random',
        ...(seed && { seed })
      }
    };
  });
}