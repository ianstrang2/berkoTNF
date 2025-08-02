// src/app/api/admin/reset-player-profiles/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('Starting player profile reset...');

    // Clear all existing profiles
    const clearResult = await prisma.players.updateMany({
      where: {
        is_ringer: false,
        profile_text: { not: null }
      },
      data: {
        profile_text: null,
        profile_generated_at: null
      }
    });

    console.log(`Cleared ${clearResult.count} existing profiles`);

    // Trigger profile regeneration
    const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/trigger-player-profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 100 }) // Process all eligible players
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Profile generation failed: ${errorText}`);
    }

    const profileResult = await profileResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Player profiles reset and regeneration triggered successfully',
      cleared_profiles: clearResult.count,
      generation_result: profileResult.results
    });

  } catch (error: any) {
    console.error('Error resetting player profiles:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset player profiles',
        details: error.message 
      },
      { status: 500 }
    );
  }
}