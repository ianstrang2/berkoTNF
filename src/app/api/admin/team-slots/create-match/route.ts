import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match creation is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const { match_date, team_a_score, team_b_score } = await request.json();
    
    // Multi-tenant: Get tenant context for scoped operations
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;

    // Get current slot assignments
    const slots = await prisma.team_slots.findMany({
      where: {
        player_id: {
          not: null
        }
      },
      orderBy: {
        slot_number: 'asc'
      },
      include: {
        players: true
      }
    });

    // Convert slots to player_matches format
    const players = slots.map(slot => ({
      player_id: slot.player_id,
      team: slot.slot_number <= 9 ? 'A' : 'B',
      goals: 0 // Initial goals set to 0
    }));

    // Create match using existing match creation logic
    const match = await prisma.$transaction(async (prisma) => {
      const newMatch = await prisma.matches.create({
        data: {
          tenant_id: tenantId,
          match_date: new Date(match_date),
          team_a_score,
          team_b_score,
          season_id: null,
        },
      } as any);

      // Create player_matches entries
      // Filter players to ensure player_id is not null for TypeScript
      const validPlayerMatchData = players
        .filter(player => player.player_id !== null) // This will satisfy TypeScript
        .map(player => {
          let clean_sheet = false;
          let heavy_win = false;
          let heavy_loss = false;
          let result = 'draw';

          if (player.team === 'A') {
            clean_sheet = team_b_score === 0;
            heavy_win = team_a_score > team_b_score && (team_a_score - team_b_score) >= 4;
            heavy_loss = team_b_score > team_a_score && (team_b_score - team_a_score) >= 4;
            if (team_a_score > team_b_score) result = 'win';
            if (team_a_score < team_b_score) result = 'loss';
          } else if (player.team === 'B') {
            clean_sheet = team_a_score === 0;
            heavy_win = team_b_score > team_a_score && (team_b_score - team_a_score) >= 4;
            heavy_loss = team_a_score > team_b_score && (team_a_score - team_b_score) >= 4;
            if (team_b_score > team_a_score) result = 'win';
            if (team_b_score < team_a_score) result = 'loss';
          }

          return {
            match_id: newMatch.match_id,
            player_id: player.player_id as number, // Asserting here since we filtered
            team: player.team,
            goals: player.goals, // player.goals is 0 from the 'players' array mapping
            clean_sheet,
            heavy_win,
            heavy_loss,
            result,
          };
        })
        // Final filter to exclude players who were not on team A or B
        .filter(data => data.team === 'A' || data.team === 'B');

      if (validPlayerMatchData.length > 0) { // Only call createMany if there's valid data
        const validPlayerMatchDataWithTenant = validPlayerMatchData.map(playerMatch => ({
          ...playerMatch,
          tenant_id: tenantId
        }));
        await prisma.player_matches.createMany({
          data: validPlayerMatchDataWithTenant,
        });
      }

      return newMatch;
    });

    return NextResponse.json({ 
      success: true,
      data: match 
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 