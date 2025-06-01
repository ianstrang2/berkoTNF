import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Prevent static generation for this route
export const dynamic = 'force-dynamic';

// Fetch player profile by ID from the aggregated table
export async function GET(request: Request) {
  try {
    console.log("Fetching player profile from aggregated table...");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      console.error("Error: No ID provided in request");
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error("Error: Invalid ID provided");
      return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 });
    }
    
    console.log('Fetching aggregated profile for ID:', numericId);

    const profile = await prisma.aggregated_player_profile_stats.findUnique({
      where: { player_id: numericId },
    });

    if (!profile) {
      console.warn('No aggregated profile found for ID:', numericId);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // The data from aggregated_player_profile_stats should mostly match the structure needed by the frontend.
    // Ensure yearly_stats is parsed if stored as a string, though Prisma handles JSONB well.
    // selected_club is also JSONB and should be handled correctly.

    // The component expects `yearly_stats` as an array.
    // Prisma should return JSONB fields as JS objects/arrays directly.
    // For example, if profile.yearly_stats is `JsonValue` type from Prisma,
    // it could be an array, object, or primitive.
    // We need to ensure it is an array for the component.
    const yearlyStatsArray = Array.isArray(profile.yearly_stats) 
                             ? profile.yearly_stats 
                             : [];

    const responseData = {
        name: profile.name,
        games_played: profile.games_played,
        fantasy_points: profile.fantasy_points,
        most_game_goals: profile.most_game_goals,
        most_game_goals_date: profile.most_game_goals_date,
        most_season_goals: profile.most_season_goals,
        most_season_goals_year: profile.most_season_goals_year,
        win_streak: profile.win_streak,
        win_streak_dates: profile.win_streak_dates, // Already a string like "date1 to date2"
        losing_streak: profile.losing_streak,
        losing_streak_dates: profile.losing_streak_dates,
        undefeated_streak: profile.undefeated_streak,
        undefeated_streak_dates: profile.undefeated_streak_dates,
        winless_streak: profile.winless_streak,
        winless_streak_dates: profile.winless_streak_dates,
        attendance_streak: profile.attendance_streak, // New field
        selected_club: profile.selected_club, // Should be JSON object
        yearly_stats: yearlyStatsArray, // Ensured to be an array
        teammate_frequency_top5: profile.teammate_frequency_top5, // New field, expect JSON array
        teammate_performance_high_top5: profile.teammate_performance_high_top5, // New field, expect JSON array
        teammate_performance_low_top5: profile.teammate_performance_low_top5, // New field, expect JSON array
        last_updated: profile.last_updated
    };

    console.log("Aggregated profile data for ID:", numericId, responseData); // DEBUG LOG
    return NextResponse.json({ profile: responseData });

  } catch (error) {
    console.error('Error fetching aggregated player profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Failed to fetch player profile: ${errorMessage}` },
      { status: 500 }
    );
  }
}