/**
 * List Tenants API Route
 * 
 * GET /api/superadmin/tenants
 * Returns list of all tenants (superadmin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin(request);

    // Fetch all tenants
    const tenants = await prisma.tenants.findMany({
      select: {
        tenant_id: true,
        slug: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get player and admin counts for each tenant
    const tenantsWithCounts = await Promise.all(
      tenants.map(async (tenant) => {
        const [playerCount, adminCount] = await Promise.all([
          prisma.players.count({
            where: { tenant_id: tenant.tenant_id },
          }),
          prisma.admin_profiles.count({
            where: { tenant_id: tenant.tenant_id },
          }),
        ]);

        return {
          ...tenant,
          playerCount,
          adminCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: tenantsWithCounts,
    });
  } catch (error: any) {
    console.error('List tenants error:', error);

    if (error.name === 'AuthenticationError' || error.name === 'AuthorizationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.name === 'AuthenticationError' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

