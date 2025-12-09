import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { postSystemMessage, SystemMessageTemplates, getDayOfWeek } from '@/lib/chat/systemMessage';

/**
 * API route to save/publish teams for an upcoming match.
 * Sets teams_saved_at timestamp, making teams visible to players.
 * Can also update team assignments if provided.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // SECURITY: Verify admin access
      await requireAdminRole(request);
      const matchId = parseInt(params.id, 10);
      
      if (isNaN(matchId)) {
        return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
      }

      const body = await request.json();
      const { state_version, teamAssignments } = body;

      if (typeof state_version !== 'number') {
        return NextResponse.json({ success: false, error: 'state_version is required' }, { status: 400 });
      }

      // Fetch current match state
      const match = await prisma.upcoming_matches.findUnique({
        where: { upcoming_match_id: matchId, tenant_id: tenantId },
      });

      if (!match) {
        return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
      }

      // Only allow saving teams in PoolLocked or TeamsBalanced states
      if (match.state !== 'PoolLocked' && match.state !== 'TeamsBalanced') {
        return NextResponse.json({ 
          success: false, 
          error: `Cannot save teams in ${match.state} state` 
        }, { status: 409 });
      }

      // Concurrency check
      if (match.state_version !== state_version) {
        return NextResponse.json({ 
          success: false, 
          error: 'Conflict: Match has been updated by someone else.' 
        }, { status: 409 });
      }

      // If team assignments provided, update them first
      if (teamAssignments && Array.isArray(teamAssignments)) {
        // Delete existing assignments and recreate
        await prisma.upcoming_match_players.deleteMany({
          where: { upcoming_match_id: matchId, tenant_id: tenantId }
        });

        await prisma.upcoming_match_players.createMany({
          data: teamAssignments.map((assignment: any) => ({
            upcoming_match_id: matchId,
            player_id: parseInt(assignment.player_id, 10),
            team: assignment.team,
            slot_number: assignment.slot_number,
            tenant_id: tenantId
          }))
        });
      }

      // Update match with teams_saved_at timestamp
      const updatedMatch = await prisma.upcoming_matches.update({
        where: { 
          upcoming_match_id: matchId,
          tenant_id: tenantId,
        },
        data: {
          teams_saved_at: new Date(),
          is_balanced: true,
          state_version: {
            increment: 1
          }
        }
      });

      console.log(`[SAVE_TEAMS] Teams saved for match ${matchId}, teams_saved_at: ${updatedMatch.teams_saved_at}`);

      // Post system message to chat
      try {
        const matchDate = new Date(match.match_date);
        const dayOfWeek = getDayOfWeek(matchDate);
        await postSystemMessage({
          tenantId,
          content: SystemMessageTemplates.teamsPublished(dayOfWeek)
        });
        console.log(`[SAVE_TEAMS] Posted system message for teams published`);
      } catch (msgError) {
        // Don't fail the request if system message fails
        console.error('[SAVE_TEAMS] Failed to post system message:', msgError);
      }

      return NextResponse.json({
        success: true,
        data: updatedMatch,
        message: 'Teams saved successfully'
      });

    } catch (error: any) {
      console.error('Error saving teams:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Server error: ${error.message}` 
      }, { status: 500 });
    }
  }).catch(handleTenantError);
}

