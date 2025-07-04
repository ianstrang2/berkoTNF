import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming prisma client is at @/lib/prisma

// Ensure this route is revalidated on every request
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const latestStatus = await prisma.aggregated_match_report.findFirst({
      orderBy: {
        // Assuming 'match_date' or a similar timestamp column exists to determine the latest record.
        // If your table uses an auto-incrementing ID as primary key for ordering, you might use:
        // id: 'desc'
        match_date: 'desc',
      },
      select: {
        on_fire_player_id: true,
        grim_reaper_player_id: true,
        match_date: true, // Included for verification, can be removed
      },
    });

    if (!latestStatus) {
      // Return default null values if no records are found
      return NextResponse.json({
        on_fire_player_id: null,
        grim_reaper_player_id: null,
      });
    }

    return NextResponse.json({
      on_fire_player_id: latestStatus.on_fire_player_id ? String(latestStatus.on_fire_player_id) : null,
      grim_reaper_player_id: latestStatus.grim_reaper_player_id ? String(latestStatus.grim_reaper_player_id) : null,
    });

  } catch (error) {
    console.error('Error fetching latest player status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest player status' },
      { status: 500 }
    );
  }
} 