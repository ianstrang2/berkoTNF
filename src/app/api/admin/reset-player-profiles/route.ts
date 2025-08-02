// src/app/api/admin/reset-player-profiles/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    console.log('Starting player profile reset...');
    
    // Check if user only wants to clear profiles without regenerating
    const body = await request.json().catch(() => ({}));
    const clearOnly = body.clear_only === true;

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

    // If user only wants to clear profiles, return early
    if (clearOnly) {
      return NextResponse.json({
        success: true,
        message: 'Player profiles cleared successfully',
        cleared_profiles: clearResult.count
      });
    }

    // Trigger profile regeneration via direct Supabase function call
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const recentDaysThreshold = parseInt(process.env.PROFILE_RECENT_DAYS_THRESHOLD || '7');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    console.log('Triggering profile regeneration via Edge Function...');
    const { data: profileResult, error: profileError } = await supabase.functions.invoke('generate-player-profiles', {
      body: { recent_days_threshold: recentDaysThreshold, limit: 100 }
    });

    if (profileError) {
      console.error('Profile generation failed:', profileError);
      // Return partial success - profiles were cleared but regeneration failed
      return NextResponse.json({
        success: true,
        message: 'Profiles cleared successfully, but regeneration failed',
        cleared_profiles: clearResult.count,
        generation_error: profileError.message,
        note: 'You can manually trigger profile generation using the "Update Profiles" button'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Player profiles reset and regeneration triggered successfully',
      cleared_profiles: clearResult.count,
      generation_result: profileResult
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