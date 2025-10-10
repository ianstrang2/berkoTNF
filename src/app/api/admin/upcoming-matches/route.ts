import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerInPool } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring admin match operations are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantMatchLock } from '@/lib/tenantLocks';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';

// GET: Fetch upcoming matches
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const active = searchParams.get('active');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let formattedMatch;

    // Define query structure with TypeScript support
    const matchQuery: any = {
      include: {
        players: {
          include: {
            players: true
          },
          orderBy: [
            { slot_number: 'asc' },
            { created_at: 'asc' }
          ]
        }
      }
    };

    if (active === 'true') {
      // Get active match
      // Multi-tenant: Query scoped to current tenant only
      console.log('Fetching active match...');
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: withTenantFilter(tenantId, { is_active: true }),
        include: {
          upcoming_match_players: {
            where: withTenantFilter(tenantId),
            include: {
              players: true
            },
            orderBy: [
              { slot_number: 'asc' },
              { created_at: 'asc' }
            ]
          }
        }
      });

      console.log('Active match result:', JSON.stringify(activeMatch, null, 2));

      if (activeMatch) {
        // Format the response
        const { upcoming_match_players, ...matchData } = activeMatch as any;
        formattedMatch = {
          ...matchData,
          players: upcoming_match_players.map(p => toPlayerInPool(p))
        };
        return new NextResponse(JSON.stringify({ success: true, data: formattedMatch }), {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        });
      }
      return new NextResponse(JSON.stringify({ success: true, data: null }), {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    } else if (matchId) {
      // Get specific match
      // Multi-tenant: Query scoped to current tenant only
      console.log(`[UPCOMING_MATCHES] Fetching match ${matchId} for tenant ${tenantId}`);
      
      // Use withTenantFilter for type-safe tenant isolation
      const match = await prisma.upcoming_matches.findUnique({
        where: { 
          upcoming_match_id: parseInt(matchId),
          tenant_id: tenantId
        },
        include: {
          upcoming_match_players: {
            where: withTenantFilter(tenantId),
            include: {
              players: true
            },
            orderBy: [
              { slot_number: 'asc' },
              { created_at: 'asc' }
            ]
          }
        }
      });

      if (!match) {
        console.error(`[UPCOMING_MATCHES] Match ${matchId} not found in tenant ${tenantId}`);
        
        // Debug: Try to find the match across all tenants
        const debugMatch = await prisma.upcoming_matches.findUnique({
          where: { upcoming_match_id: parseInt(matchId) }
        });
        
        if (debugMatch) {
          console.error(`[UPCOMING_MATCHES] DEBUG: Match ${matchId} exists in tenant ${debugMatch.tenant_id}, but we're looking in ${tenantId}`);
        } else {
          console.error(`[UPCOMING_MATCHES] DEBUG: Match ${matchId} does not exist at all`);
        }
        
        return NextResponse.json({ 
          success: false, 
          error: `Match ${matchId} not found in tenant ${tenantId}` 
        }, { status: 404 });
      }

      console.log(`[UPCOMING_MATCHES] Found match ${matchId} in state ${match.state} with ${(match as any).upcoming_match_players?.length || 0} players`);
      
      // DEBUG: Log the raw match data structure
      console.log(`[UPCOMING_MATCHES] DEBUG: Match upcoming_match_players structure:`, 
        JSON.stringify((match as any).upcoming_match_players?.slice(0, 2), null, 2));

      // Format the response
      const { upcoming_match_players, ...matchData } = match as any;
      
      if (!upcoming_match_players || upcoming_match_players.length === 0) {
        console.error(`[UPCOMING_MATCHES] ERROR: No upcoming_match_players found for match ${matchId}`);
      } else {
        // Check first player for nested data
        const firstPlayer = upcoming_match_players[0];
        console.log(`[UPCOMING_MATCHES] DEBUG: First player structure:`, JSON.stringify(firstPlayer, null, 2));
        
        if (!firstPlayer.players) {
          console.error(`[UPCOMING_MATCHES] ERROR: Missing 'players' relationship in upcoming_match_players`);
        }
      }
      
      formattedMatch = {
        ...matchData,
        players: upcoming_match_players.map(p => toPlayerInPool(p))
      };

      return NextResponse.json({ success: true, data: formattedMatch }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    } else {
      // Fetch all upcoming matches
      // Multi-tenant: Using withTenantFilter for defense-in-depth
      console.log(`[UPCOMING_MATCHES] Fetching all matches for tenant ${tenantId}`);
      
      const matches = await prisma.upcoming_matches.findMany({
        where: withTenantFilter(tenantId),
        orderBy: {
          match_date: 'asc'
        },
        include: {
          _count: {
            select: { upcoming_match_players: true }
          }
        }
      });
      
      console.log(`[UPCOMING_MATCHES] Found ${matches.length} total matches`);

      return NextResponse.json({ success: true, data: matches }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
  }).catch(handleTenantError);
}

// POST: Create a new upcoming match
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();
    const { match_date, team_size } = body;

    if (!match_date) {
      return NextResponse.json({ success: false, error: 'Match date is required' }, { status: 400 });
    }

    if (!team_size || team_size < 5 || team_size > 11) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team size is required and must be between 5 and 11' 
      }, { status: 400 });
    }

    // If creating a new active match, deactivate any existing active matches
    // Multi-tenant: Only deactivate matches within the same tenant
    if (body.is_active === true) {
      await prisma.upcoming_matches.updateMany({
        where: withTenantFilter(tenantId, { is_active: true }),
        data: { is_active: false }
      });
    }

    // Create new match
    // Multi-tenant: Create match in the current tenant
    const newMatch = await prisma.upcoming_matches.create({
      data: {
        tenant_id: tenantId,
        match_date: new Date(match_date),
        team_size: team_size,
        is_balanced: false,
        is_active: body.is_active !== undefined ? body.is_active : true // Default to active if not specified
      }
    });

    return NextResponse.json({ success: true, data: newMatch });
  }).catch(handleTenantError);
}

// PUT: Update an existing upcoming match
export async function PUT(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();
    const { match_id, upcoming_match_id, state_version, match_date, team_size, is_balanced, is_active } = body;
    
    // Use upcoming_match_id if provided, fallback to match_id for compatibility
    let targetMatchId = upcoming_match_id || match_id;

    if (!targetMatchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    // Ensure the ID is an integer
    targetMatchId = parseInt(targetMatchId, 10);
    if (isNaN(targetMatchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
    }

    // Get current match to check current team size
    // Multi-tenant: Query scoped to current tenant only
    const currentMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
      include: { 
        _count: { select: { upcoming_match_players: true } } 
      }
    });

    if (!currentMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Add state_version concurrency check
    if (typeof state_version === 'number' && currentMatch.state_version !== state_version) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match was updated by another user. Please refresh and try again.' 
      }, { status: 409 });
    }

    // Check if team size is being reduced and there are more players than the new size would allow
    if (team_size && team_size < currentMatch.team_size && (currentMatch as any)._count.upcoming_match_players > team_size * 2) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot reduce team size: ${(currentMatch as any)._count.upcoming_match_players} players are assigned but new team size would only allow ${team_size * 2} players.`
      }, { status: 400 });
    }

    // If setting match as active, deactivate any other active matches
    // Multi-tenant: Only deactivate matches within the same tenant
    if (is_active === true && !currentMatch.is_active) {
      await prisma.upcoming_matches.updateMany({
        where: { 
          tenant_id: tenantId,
          is_active: true,
          upcoming_match_id: { not: targetMatchId }
        },
        data: { is_active: false }
      });
    }

    // Update match with state_version increment
    // Multi-tenant: Update within the current tenant only
    const updatedMatch = await prisma.upcoming_matches.update({
      where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
      data: {
        match_date: match_date ? new Date(match_date) : undefined,
        team_size: team_size,
        is_balanced: is_balanced !== undefined ? is_balanced : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
        state_version: { increment: 1 }
      }
    });

    return NextResponse.json({ success: true, data: updatedMatch });
  }).catch(handleTenantError);
}

// DELETE: Remove an upcoming match
export async function DELETE(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('id');

    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    const upcomingMatchId = parseInt(matchId);
    if (isNaN(upcomingMatchId)) {
      return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
    }

    // Get the match to check its state
    // Multi-tenant: Query scoped to current tenant only
    const upcomingMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: upcomingMatchId, tenant_id: tenantId }
    });

    if (!upcomingMatch) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    let shouldTriggerStatsUpdate = false;

    // Multi-tenant: Use tenant-aware transaction with advisory locking for safety
    await withTenantMatchLock(tenantId, upcomingMatchId, async (tx) => {
      // If this is a completed match, we need to delete historical data too
      if (upcomingMatch.state === 'Completed') {
        // Find the linked historical match
        // Multi-tenant: Search within tenant only (RLS handles tenant scoping)
        const historicalMatch = await tx.matches.findFirst({
          where: { 
            upcoming_match_id: upcomingMatchId
          }
        });

        if (historicalMatch) {
          // Delete player_matches first (referential integrity)
          // Multi-tenant: Delete within tenant only (RLS handles tenant scoping)
          await tx.player_matches.deleteMany({
            where: { 
              match_id: historicalMatch.match_id
            }
          });

          // Delete the historical match
          // Multi-tenant: Delete within tenant only (RLS handles tenant scoping)
          await tx.matches.delete({
            where: { 
              match_id: historicalMatch.match_id
            }
          });

          // Flag that we need stats recalculation
          shouldTriggerStatsUpdate = true;
        }
      }

      // Delete player assignments
      // Multi-tenant: Delete within tenant only (RLS handles tenant scoping)
      await tx.upcoming_match_players.deleteMany({
        where: { 
          upcoming_match_id: upcomingMatchId
        }
      });

      // Delete player pool data
      // Multi-tenant: Delete within tenant only (RLS handles tenant scoping)
      await tx.match_player_pool.deleteMany({
        where: { 
          upcoming_match_id: upcomingMatchId
        }
      });

      // Delete the upcoming match
      // Multi-tenant: Delete within tenant only
      await tx.upcoming_matches.delete({
        where: { 
          upcoming_match_id: upcomingMatchId
        }
      });
    });

    // Trigger stats recalculation if we deleted a completed match (fire and forget)
    if (shouldTriggerStatsUpdate) {
      // Don't await - let stats update run in background
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      fetch(new URL('/api/admin/trigger-stats-update', baseUrl), {
        method: 'POST',
      }).catch(statsError => {
        console.warn('Could not trigger stats recalculation:', statsError);
        // Stats update failure doesn't affect deletion success
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: shouldTriggerStatsUpdate 
        ? 'Match deleted successfully. Stats are being recalculated.'
        : 'Match deleted successfully.'
    });
  }).catch(handleTenantError);
} 