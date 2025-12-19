import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

/**
 * Player-accessible config API
 * 
 * Returns read-only config settings needed for player views.
 * Does NOT require admin role - just authenticated user with tenant.
 * 
 * This is much faster than /api/admin/app-config because it skips
 * the requireAdminRole() check which does 2 additional DB queries.
 */
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const { searchParams } = new URL(request.url);
    const groupsParam = searchParams.get('groups');
    
    // Whitelist of groups accessible to players (read-only, non-sensitive)
    const allowedGroups = ['club_team_names', 'match_report'];
    
    // Parse requested groups
    let requestedGroups: string[] = [];
    if (groupsParam) {
      requestedGroups = groupsParam.split(',').map(g => g.trim()).filter(g => g);
    }
    
    // Filter to only allowed groups
    const groups = requestedGroups.length > 0 
      ? requestedGroups.filter(g => allowedGroups.includes(g))
      : allowedGroups;
    
    if (groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }
    
    const configs = await prisma.app_config.findMany({
      where: {
        tenant_id: tenantId,
        config_group: { in: groups }
      },
      select: {
        config_key: true,
        config_value: true,
        config_group: true,
      }
    });
    
    return NextResponse.json({
      success: true,
      data: configs
    }, {
      headers: {
        // Allow 1 minute cache for config (doesn't change often)
        'Cache-Control': 'private, max-age=60',
        'Vary': 'Cookie',
      }
    });
  }).catch(handleTenantError);
}
