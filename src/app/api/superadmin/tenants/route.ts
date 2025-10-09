import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';

// Superadmin routes use service role to access cross-tenant data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Get all tenants with enhanced metrics (using service role to bypass RLS)
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('tenant_id, name, slug, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (tenantsError) throw tenantsError;
    if (!tenants) {
      return NextResponse.json({ success: true, data: [] });
    }

    // For each tenant, fetch metrics by temporarily setting context
    const { prisma } = await import('@/lib/prisma');
    
    const tenantsWithMetrics = await Promise.all(
      tenants.map(async (tenant) => {
        // Set RLS context for this tenant's metrics
        await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.tenant_id}, false)`;

        // Get tenant-scoped counts (now with RLS context set)
        const playerCount = await prisma.players.count({
          where: { tenant_id: tenant.tenant_id, is_retired: false }
        });

        let adminCount = 0;
        try {
          adminCount = await prisma.admin_profiles.count({
            where: { tenant_id: tenant.tenant_id }
          });
        } catch (e) {
          // admin_profiles might not exist
        }

        const activeMatchesCount = await prisma.upcoming_matches.count({
          where: {
            tenant_id: tenant.tenant_id,
            state: { in: ['Draft', 'PoolLocked', 'TeamsBalanced'] }
          }
        });

        const totalMatchesCount = await prisma.matches.count({
          where: { tenant_id: tenant.tenant_id }
        });

        const lastMatch = await prisma.matches.findFirst({
          where: { tenant_id: tenant.tenant_id },
          orderBy: { match_date: 'desc' },
          select: { match_date: true }
        });

        const now = new Date();
        const lastActivityAt = lastMatch?.match_date || tenant.created_at || now;
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

    // Old code below - remove the duplicate query
    /*
    const tenants = await prisma.tenants.findMany({
    */

    return NextResponse.json({
      success: true,
      data: tenantsWithMetrics
    });

  } catch (error) {
    return handleTenantError(error);
  }
}