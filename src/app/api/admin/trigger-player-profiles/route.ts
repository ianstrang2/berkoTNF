import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Main profile generation logic that can be called by both GET (cron) and POST (manual)
async function triggerProfileGeneration() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recentDaysThreshold = parseInt(process.env.PROFILE_RECENT_DAYS_THRESHOLD || '7');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing.');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log(`🎭 Starting profile generation with ${recentDaysThreshold}-day threshold`);

  try {
    // Call the Edge Function with retry logic
    let attempt = 0;
    const maxAttempts = 3;
    let invokeError = null;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for generate-player-profiles`);
      
      const { data, error } = await supabase.functions.invoke('generate-player-profiles', {
        body: { 
          recent_days_threshold: recentDaysThreshold,
          offset: 0, // Start from beginning for full batch
          league_id: null // Future multi-tenancy support
        }
      });
      
      if (!error) {
        console.log('✅ Profile generation completed successfully');
        return NextResponse.json({ 
          success: true, 
          message: 'Profile generation completed',
          results: data,
          recent_days_threshold: recentDaysThreshold,
          timestamp: new Date().toISOString()
        });
      }
      
      invokeError = error;
      console.log(`Attempt ${attempt} failed for generate-player-profiles:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.error(`All attempts failed for generate-player-profiles:`, invokeError);
    return NextResponse.json({ 
      success: false, 
      error: `Profile generation failed: ${invokeError.message}`,
      recent_days_threshold: recentDaysThreshold,
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile generation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Profile generation failed: ${errorMessage}`,
      recent_days_threshold: recentDaysThreshold,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET handler for Vercel cron jobs
export async function GET() {
  console.log('📅 Cron job triggered profile generation');
  return triggerProfileGeneration();
}

// POST handler for manual admin triggers
export async function POST() {
  console.log('👤 Manual admin triggered profile generation');
  return triggerProfileGeneration();
}