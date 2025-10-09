import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const upcomingMatchId = searchParams.get('upcoming_match_id');
    
    let targetMatchId;
    
    if (upcomingMatchId) {
      // Use provided upcoming_match_id
      targetMatchId = parseInt(upcomingMatchId);
    } else if (matchId) {
      // Use provided matchId for backward compatibility
      targetMatchId = parseInt(matchId);
    } else {
      // Find the active match if no match ID is provided
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true, tenant_id: tenantId },
        select: { upcoming_match_id: true }
      });
      
      if (!activeMatch) {
        return NextResponse.json({ 
          success: false, 
          error: 'No active match found' 
        }, { status: 404 });
      }
      
      targetMatchId = activeMatch.upcoming_match_id;
    }

    // Instead of deleting, update the records to move players back to the pool
    await prisma.upcoming_match_players.updateMany({
      where: { upcoming_match_id: targetMatchId },
      data: {
        team: 'Unassigned',
        slot_number: null,
      },
    });

    // Set is_balanced to false for the match
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId },
      data: { is_balanced: false }
    });

    return NextResponse.json({ 
      success: true,
      message: 'All players cleared from match'
    });
  }).catch(handleTenantError);
} 