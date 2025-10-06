import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

export async function GET(request: NextRequest) {
  try {
    // Get all tenants with enhanced metrics
    const tenants = await prisma.tenants.findMany({
      select: {
        tenant_id: true,
        name: true,
        slug: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Fetch additional metrics for each tenant
    const tenantsWithMetrics = await Promise.all(
      tenants.map(async (tenant) => {
        // Set tenant context for queries
        await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.tenant_id}, false)`;

        // Get player count
        const playerCount = await prisma.players.count({
          where: { 
            tenant_id: tenant.tenant_id,
            is_retired: false 
          }
        });

        // Get admin count (when admin_profiles table exists)
        let adminCount = 0;
        try {
          adminCount = await prisma.admin_profiles.count({
            where: { tenant_id: tenant.tenant_id }
          });
        } catch (e) {
          // admin_profiles might not exist yet
        }

        // Get active matches count (Draft + upcoming)
        const activeMatchesCount = await prisma.upcoming_matches.count({
          where: {
            tenant_id: tenant.tenant_id,
            state: { in: ['Draft', 'PoolLocked', 'TeamsBalanced'] }
          }
        });

        // Get total matches count
        const totalMatchesCount = await prisma.matches.count({
          where: { tenant_id: tenant.tenant_id }
        });

        // Get last activity (most recent match date)
        const lastMatch = await prisma.matches.findFirst({
          where: { tenant_id: tenant.tenant_id },
          orderBy: { match_date: 'desc' },
          select: { match_date: true }
        });

        // Calculate activity status
        const now = new Date();
        const lastActivityAt = lastMatch?.match_date || tenant.created_at;
        const daysSinceActivity = Math.floor(
          (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        let activityStatus: 'active' | 'recent' | 'inactive';
        if (daysSinceActivity <= 7) {
          activityStatus = 'active';
        } else if (daysSinceActivity <= 30) {
          activityStatus = 'recent';
        } else {
          activityStatus = 'inactive';
        }

        return {
          ...tenant,
          playerCount,
          adminCount,
          activeMatchesCount,
          totalMatchesCount,
          lastActivityAt,
          activityStatus,
          daysSinceActivity
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: tenantsWithMetrics
    });

  } catch (error: any) {
    console.error('Error fetching tenants with metrics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}