// src/app/api/admin/player-profile-metadata/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
    ` as any[];

    // Get all players with profile status, ordered by oldest profile update first
    const playersList = await prisma.$queryRaw`
      SELECT 
        name,
        is_retired,
        is_ringer,
        profile_generated_at
      FROM players
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

  } catch (error: any) {
    console.error('Error fetching player profile metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player profile metadata' },
      { status: 500 }
    );
  }
}