import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match pool operations are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';
import { requireAdminRole } from '@/lib/auth/apiAuth';

// GET: Fetch player pool for a match
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('match_id');
    const activeOnly = searchParams.get('active') === 'true';

    let whereClause: any = {};
    
    if (matchId) {
      // Get player pool for a specific match
      whereClause.upcoming_match_id = parseInt(matchId);
    } else if (activeOnly) {
      // Get player pool for the active match
      // Multi-tenant: Using withTenantFilter() helper for type-safe tenant isolation
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: withTenantFilter(tenantId, { is_active: true }),
        select: { upcoming_match_id: true }
      });
      
      if (!activeMatch) {
        return NextResponse.json({ 
          success: true, 
          data: [], 
          message: 'No active match found' 
        });
      }
      
      whereClause.upcoming_match_id = activeMatch.upcoming_match_id;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Either match_id or active=true is required' 
      }, { status: 400 });
    }

    // Get player pool with player details
    // Multi-tenant: Using withTenantFilter() helper for type-safe tenant isolation
    const playerPool = await prisma.match_player_pool.findMany({
      where: withTenantFilter(tenantId, whereClause),
      include: {
        players: {
          select: {
            name: true,
            goalscoring: true,
            defender: true,
            stamina_pace: true,
            control: true,
            teamwork: true,
            resilience: true,
            is_ringer: true,
            is_retired: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    // Format the response
    const formattedPlayers = playerPool.map(entry => ({
      id: entry.player_id.toString(),
      pool_id: entry.id,
      match_id: entry.upcoming_match_id,
      response_status: entry.response_status,
      response_timestamp: entry.response_timestamp,
      notification_sent: entry.notification_sent,
      notification_timestamp: entry.notification_timestamp,
      notes: entry.notes,
      name: (entry as any).players?.name,
      goalscoring: (entry as any).players?.goalscoring,
      defending: (entry as any).players?.defender,
      stamina_pace: (entry as any).players?.stamina_pace,
      control: (entry as any).players?.control,
      teamwork: (entry as any).players?.teamwork,
      resilience: (entry as any).players?.resilience,
      is_ringer: (entry as any).players?.is_ringer,
      is_retired: (entry as any).players?.is_retired
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedPlayers 
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      },
    });
  }).catch(handleTenantError);
}

// POST: Add a player to the match pool
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const { match_id, player_id } = await request.json();
    if (!match_id || !player_id) {
      return NextResponse.json({ success: false, error: 'Match ID and Player ID are required' }, { status: 400 });
    }

    // Multi-tenant: Create player assignment in the current tenant
    const newPlayer = await prisma.upcoming_match_players.create({
      data: {
        tenant_id: tenantId,
        upcoming_match_id: parseInt(match_id),
        player_id: parseInt(player_id),
        team: 'Unassigned',
      },
    });

    return NextResponse.json({ success: true, data: newPlayer });
  }).catch(handleTenantError);
}

// DELETE: Remove a player from the match pool
export async function DELETE(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('match_id');
    const playerId = searchParams.get('player_id');

    if (!matchId || !playerId) {
      return NextResponse.json({ success: false, error: 'Match ID and Player ID are required' }, { status: 400 });
    }

    // Multi-tenant: Remove player assignment within the current tenant only
    await prisma.upcoming_match_players.deleteMany({
      where: {
        upcoming_match_id: parseInt(matchId),
        player_id: parseInt(playerId),
      },
    });

    return NextResponse.json({ success: true });
  }).catch(handleTenantError);
}

// Helper function to handle DELETE with request body - REMOVED as logic is consolidated
// async function handleDeleteWithBody(body: any) { ... } 