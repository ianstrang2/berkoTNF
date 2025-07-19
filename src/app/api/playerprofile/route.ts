import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Prevent static generation for this route
export const dynamic = 'force-dynamic';

// Fetch player profile by ID from the aggregated table AND power ratings
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

    // Fetch profile data and power ratings in parallel
    const [profile, powerRatings, leagueStats, currentStreaks, records] = await Promise.all([
      // Existing profile query
      prisma.aggregated_player_profile_stats.findUnique({
        where: { player_id: numericId },
      }),
      
      // Power ratings query
      prisma.aggregated_player_power_ratings.findUnique({
        where: { player_id: numericId },
        select: {
          rating: true,
          goal_threat: true,
          defensive_shield: true,
          updated_at: true
        }
      }),
      
      // League normalization data (for power ratings and streaks)
             prisma.$queryRaw`
         SELECT 
           -- Power rating stats
           MIN(rating::numeric) as power_rating_min,
           MAX(rating::numeric) as power_rating_max,
           AVG(rating::numeric) as power_rating_avg,
           MIN(goal_threat::numeric) as goal_threat_min,
           MAX(goal_threat::numeric) as goal_threat_max,
           AVG(goal_threat::numeric) as goal_threat_avg,
           MIN(defensive_shield::numeric) as defensive_shield_min,
           MAX(defensive_shield::numeric) as defensive_shield_max,
           AVG(defensive_shield::numeric) as defensive_shield_avg
         FROM aggregated_player_power_ratings
         UNION ALL
         SELECT 
           -- Streak stats
           MIN(win_streak::numeric) as win_streak_min,
           MAX(win_streak::numeric) as win_streak_max,
           AVG(win_streak::numeric) as win_streak_avg,
           MIN(undefeated_streak::numeric) as undefeated_streak_min,
           MAX(undefeated_streak::numeric) as undefeated_streak_max,
           AVG(undefeated_streak::numeric) as undefeated_streak_avg,
           MIN(losing_streak::numeric) as losing_streak_min,
           MAX(losing_streak::numeric) as losing_streak_max,
           AVG(losing_streak::numeric) as losing_streak_avg
         FROM aggregated_player_profile_stats
         UNION ALL
         SELECT 
           -- More streak stats  
           MIN(winless_streak::numeric) as winless_streak_min,
           MAX(winless_streak::numeric) as winless_streak_max,
           AVG(winless_streak::numeric) as winless_streak_avg,
           MIN(attendance_streak::numeric) as attendance_streak_min,
           MAX(attendance_streak::numeric) as attendance_streak_max,
           AVG(attendance_streak::numeric) as attendance_streak_avg,
           0 as placeholder1, 0 as placeholder2, 0 as placeholder3
         FROM aggregated_player_profile_stats
       `,
       
       // Current streaks from latest match report
       prisma.aggregated_match_report.findFirst({
         select: {
           streaks: true,
           goal_streaks: true,
           match_date: true
         },
         orderBy: {
           match_date: 'desc'
         }
       }),

       // Fetch aggregated_records for max values
       prisma.aggregated_records.findFirst({
         select: {
           records: true
         }
       })
    ]);

    if (!profile) {
      console.warn('No aggregated profile found for ID:', numericId);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Process league stats from raw query result
    const rawStats = leagueStats as any[];
    const leagueNormalization = {
      powerRating: {
        min: Number(rawStats[0]?.power_rating_min || 0),
        max: Number(rawStats[0]?.power_rating_max || 100),
        average: Number(rawStats[0]?.power_rating_avg || 50)
      },
      goalThreat: {
        min: Number(rawStats[0]?.goal_threat_min || 0),
        max: Number(rawStats[0]?.goal_threat_max || 100),
        average: Number(rawStats[0]?.goal_threat_avg || 50)
      },
      defensiveShield: {
        min: Number(rawStats[0]?.defensive_shield_min || 0),
        max: Number(rawStats[0]?.defensive_shield_max || 100),
        average: Number(rawStats[0]?.defensive_shield_avg || 50)
      },
      streaks: {
        winStreak: {
          min: Number(rawStats[1]?.win_streak_min || 0),
          max: Number(rawStats[1]?.win_streak_max || 10),
          average: Number(rawStats[1]?.win_streak_avg || 2)
        },
        undefeatedStreak: {
          min: Number(rawStats[1]?.undefeated_streak_min || 0),
          max: Number(rawStats[1]?.undefeated_streak_max || 10),
          average: Number(rawStats[1]?.undefeated_streak_avg || 3)
        },
        losingStreak: {
          min: Number(rawStats[1]?.losing_streak_min || 0),
          max: Number(rawStats[1]?.losing_streak_max || 10),
          average: Number(rawStats[1]?.losing_streak_avg || 2)
        },
        winlessStreak: {
          min: Number(rawStats[2]?.winless_streak_min || 0),
          max: Number(rawStats[2]?.winless_streak_max || 10),
          average: Number(rawStats[2]?.winless_streak_avg || 3)
        },
        attendanceStreak: {
          min: Number(rawStats[2]?.attendance_streak_min || 0),
          max: Number(rawStats[2]?.attendance_streak_max || 50),
          average: Number(rawStats[2]?.attendance_streak_avg || 15)
        }
      }
    };

    // Parse current streaks from match report
    const currentStreakData = currentStreaks?.streaks as any[] || [];
    const currentGoalStreakData = currentStreaks?.goal_streaks as any[] || [];
    
    console.log(`Debug: All available goal streaks:`, currentGoalStreakData);
    console.log(`Debug: Looking for player name: "${profile.name}"`);
    
    // Extract current streaks for this player  
    const playerCurrentStreaks = currentStreakData.find(s => s.name === profile.name);
    const playerCurrentGoalStreak = currentGoalStreakData.find(gs => gs.name === profile.name);
    
    console.log(`Debug: Found for ${profile.name}:`, {
      playerCurrentStreaks,
      playerCurrentGoalStreak,
      scoring_value: playerCurrentGoalStreak?.matches_with_goals
    });
    
    // Create current streaks object
    const current_streaks = {
      win: playerCurrentStreaks?.streak_type === 'win' ? playerCurrentStreaks.streak_count : 0,
      undefeated: playerCurrentStreaks?.streak_type === 'unbeaten' ? playerCurrentStreaks.streak_count : 0,
      losing: playerCurrentStreaks?.streak_type === 'loss' ? playerCurrentStreaks.streak_count : 0,
      winless: playerCurrentStreaks?.streak_type === 'winless' ? playerCurrentStreaks.streak_count : 0,
      scoring: playerCurrentGoalStreak?.matches_with_goals || 0,
      attendance: 0 // TODO: Calculate current attendance streak if needed
    };
    
    // DEBUG logging
    console.log(`Debug: attendance_streak_dates for ${profile.name}:`, (profile as any).attendance_streak_dates);
    console.log(`Debug: current_streaks for ${profile.name}:`, current_streaks);

    // Process records data for max values
    const recordsData = records?.records as any || {};
    const streakRecords = {
      winStreak: recordsData.streaks?.['Win Streak']?.holders?.[0]?.streak || leagueNormalization.streaks.winStreak.max,
      undefeatedStreak: recordsData.streaks?.['Undefeated Streak']?.holders?.[0]?.streak || leagueNormalization.streaks.undefeatedStreak.max,
      losingStreak: recordsData.streaks?.['Losing Streak']?.holders?.[0]?.streak || leagueNormalization.streaks.losingStreak.max,
      winlessStreak: recordsData.streaks?.['Winless Streak']?.holders?.[0]?.streak || leagueNormalization.streaks.winlessStreak.max,
      attendanceStreak: recordsData.attendance_streak?.[0]?.streak || leagueNormalization.streaks.attendanceStreak.max,
      scoringStreak: recordsData.consecutive_goals_streak?.[0]?.streak || 10 // Default fallback
    };

    // The component expects `yearly_stats` as an array.
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
        scoring_streak: (profile as any).scoring_streak, // New field
        scoring_streak_dates: (profile as any).scoring_streak_dates, // New field
        attendance_streak: profile.attendance_streak, // New field
        attendance_streak_dates: (profile as any).attendance_streak_dates, // New field
        selected_club: profile.selected_club, // Should be JSON object
        yearly_stats: yearlyStatsArray, // Ensured to be an array
        teammate_chemistry_all: (profile as any).teammate_chemistry_all, // New comprehensive teammate data
        last_updated: profile.last_updated,
        
        // NEW: Power ratings data
        power_ratings: powerRatings ? {
          rating: Number(powerRatings.rating),
          goal_threat: Number(powerRatings.goal_threat || 0),
          defensive_shield: Number(powerRatings.defensive_shield || 0),
          updated_at: powerRatings.updated_at
        } : null,
        
        // NEW: League normalization data for frontend
        league_normalization: leagueNormalization,
        
        // NEW: Streak records for max values
        streak_records: streakRecords,
        
        // NEW: Current streaks data
        current_streaks: current_streaks
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