// src/app/api/admin/player-profile-metadata/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring player profile metadata is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    // Multi-tenant: Get tenant context for scoped queries
    const tenantId = await getTenantFromRequest(request);
    
    // Get profile generation statistics
    const profileStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_players,
        COUNT(profile_text) as profiles_generated,
        COUNT(CASE WHEN profile_text IS NOT NULL THEN 1 END) as with_profiles,
        COUNT(CASE WHEN profile_text IS NULL THEN 1 END) as without_profiles,
        COUNT(CASE WHEN is_retired = true AND profile_text IS NOT NULL THEN 1 END) as retired_with_profiles,
        COUNT(CASE WHEN is_retired = true AND profile_text IS NULL THEN 1 END) as retired_without_profiles,
        COUNT(CASE WHEN is_retired = false AND profile_text IS NOT NULL THEN 1 END) as active_with_profiles,
        COUNT(CASE WHEN is_retired = false AND profile_text IS NULL THEN 1 END) as active_without_profiles
      FROM players 
      WHERE is_ringer = false
        AND tenant_id = ${tenantId}::uuid
    ` as any[];

    // Get all players with profile status, ordered by oldest profile update first
    const playersList = await prisma.$queryRaw`
      SELECT 
        name,
        is_retired,
        is_ringer,
        profile_generated_at
      FROM players
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY 
        profile_generated_at ASC NULLS FIRST,
        name ASC
    ` as any[];

    const stats = profileStats[0];

    return NextResponse.json({
      stats: {
        total_players: Number(stats.total_players),
        profiles_generated: Number(stats.profiles_generated),
        with_profiles: Number(stats.with_profiles),
        without_profiles: Number(stats.without_profiles),
        retired_with_profiles: Number(stats.retired_with_profiles),
        retired_without_profiles: Number(stats.retired_without_profiles),
        active_with_profiles: Number(stats.active_with_profiles),
        active_without_profiles: Number(stats.active_without_profiles)
      },
      players_list: playersList
    });

  } catch (error) {
    return handleTenantError(error);
  }
}