import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';
import { requireAdminRole } from '@/lib/auth/apiAuth';

/**
 * API route to fetch historical match data for a specific upcoming_match_id.
 * Used by CompleteMatchForm to pre-fill scores when editing completed matches.
 * 
 * This replaces the wasteful /api/matches/history fetch (2.5 MB) with a 
 * targeted query for a single match (~500 bytes).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    const upcomingMatchId = parseInt(params.id, 10);

    if (isNaN(upcomingMatchId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid match ID' },
        { status: 400 }
      );
    }

    // Fetch the specific historical match linked to this upcoming_match_id
    const historicalMatch = await prisma.matches.findFirst({
      where: withTenantFilter(tenantId, {
        upcoming_match_id: upcomingMatchId
      }),
      include: {
        player_matches: {
          include: {
            players: true
          }
        }
      }
    });

    if (!historicalMatch) {
      return NextResponse.json(
        { success: false, error: 'Historical match not found' },
        { status: 404 }
      );
    }

    // Format response to match existing format (array with single match)
    const formattedMatch = {
      match_id: historicalMatch.match_id,
      upcoming_match_id: historicalMatch.upcoming_match_id,
      match_date: historicalMatch.match_date.toISOString(),
      team_a_score: historicalMatch.team_a_score,
      team_b_score: historicalMatch.team_b_score,
      team_a_own_goals: (historicalMatch as any).team_a_own_goals || 0,
      team_b_own_goals: (historicalMatch as any).team_b_own_goals || 0,
      created_at: historicalMatch.created_at!.toISOString(),
      player_matches: historicalMatch.player_matches.map(pm => ({
        player_match_id: pm.player_match_id,
        player_id: pm.player_id,
        match_id: pm.match_id,
        team: pm.team,
        goals: pm.goals,
        clean_sheet: pm.clean_sheet,
        result: pm.result,
        fantasy_points: pm.fantasy_points,
        actual_team: (pm as any).actual_team || pm.team,
        players: pm.players ? {
          name: pm.players.name,
          join_date: pm.players.join_date!.toISOString()
        } : null,
      })),
    };

    return NextResponse.json({ 
      success: true, 
      data: formattedMatch 
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError);
}

