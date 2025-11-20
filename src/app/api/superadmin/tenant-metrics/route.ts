import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { requireSuperadmin } from '@/lib/auth/apiAuth';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Only superadmins can access tenant-specific metrics
    await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId parameter required' },
        { status: 400 }
      );
    }

    // Set tenant context
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;

    // Get tenant info
    const tenant = await prisma.tenants.findUnique({
      where: { tenant_id: tenantId },
      select: {
        tenant_id: true,
        name: true,
        slug: true,
        is_active: true,
        created_at: true
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Match statistics
    const totalMatches = await prisma.matches.count({
      where: { tenant_id: tenantId }
    });

    const upcomingMatches = await prisma.upcoming_matches.count({
      where: {
        tenant_id: tenantId,
        state: { in: ['Draft', 'PoolLocked', 'TeamsBalanced'] }
      }
    });

    const lastMatch = await prisma.matches.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { match_date: 'desc' },
      select: { match_date: true }
    });

    // Player statistics
    const totalPlayers = await prisma.players.count({
      where: {
        tenant_id: tenantId,
        is_retired: false
      }
    });

    const retiredPlayers = await prisma.players.count({
      where: {
        tenant_id: tenantId,
        is_retired: true
      }
    });

    const ringers = await prisma.players.count({
      where: {
        tenant_id: tenantId,
        is_ringer: true,
        is_retired: false
      }
    });

    // Active players (played in last 30 days)
    // Note: player_matches doesn't have created_at, so we'll use matches.match_date
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMatches = await prisma.matches.findMany({
      where: {
        tenant_id: tenantId,
        match_date: { gte: thirtyDaysAgo }
      },
      select: { match_id: true }
    });
    
    const recentMatchIds = recentMatches.map(m => m.match_id);
    
    const activePlayers = recentMatchIds.length > 0 
      ? await prisma.player_matches.groupBy({
          by: ['player_id'],
          where: {
            tenant_id: tenantId,
            match_id: { in: recentMatchIds }
          },
          _count: true
        })
      : [];

    // Cache metadata for this tenant
    const cacheMetadata = await prisma.cache_metadata.findMany({
      where: { tenant_id: tenantId },
      orderBy: { last_invalidated: 'desc' }
    });

    // Player profiles for this tenant
    const players = await prisma.players.findMany({
      where: { tenant_id: tenantId },
      select: {
        player_id: true,
        name: true,
        is_ringer: true,
        is_retired: true,
        profile_generated_at: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        tenant,
        stats: {
          matches: {
            total: totalMatches,
            upcoming: upcomingMatches,
            lastMatchDate: lastMatch?.match_date || null
          },
          players: {
            total: totalPlayers,
            active: activePlayers.length,
            retired: retiredPlayers,
            ringers: ringers
          }
        },
        cacheMetadata,
        players
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
}
