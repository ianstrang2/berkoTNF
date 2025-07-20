import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      
      // Power ratings query (2-metric system)
      prisma.aggregated_player_power_ratings.findUnique({
        where: { player_id: numericId },
        select: {
          trend_rating: true,
          trend_goal_threat: true,
          league_avg_goal_threat: true,
          updated_at: true
        } as any
      }),
      
      // League normalization data (for power ratings and streaks) - 2-metric system
      prisma.$queryRaw`
        SELECT 
          -- Power rating stats (trend-adjusted)
          MIN(trend_rating::numeric) as power_rating_min,
          MAX(trend_rating::numeric) as power_rating_max,
          AVG(trend_rating::numeric) as power_rating_avg,
          MIN(trend_goal_threat::numeric) as goal_threat_min,
          MAX(trend_goal_threat::numeric) as goal_threat_max,
          AVG(trend_goal_threat::numeric) as goal_threat_avg
        FROM aggregated_player_power_ratings
        WHERE trend_rating IS NOT NULL
        UNION ALL
        SELECT 
          -- Streak stats
          MIN(win_streak::numeric) as win_streak_min,
          MAX(win_streak::numeric) as win_streak_max,
          AVG(win_streak::numeric) as win_streak_avg,
          MIN(undefeated_streak::numeric) as undefeated_streak_min,
          MAX(undefeated_streak::numeric) as undefeated_streak_max,
          AVG(undefeated_streak::numeric) as undefeated_streak_avg
        FROM aggregated_player_profile_stats
        UNION ALL
        SELECT 
          -- More streak stats  
          MIN(losing_streak::numeric) as losing_streak_min,
          MAX(losing_streak::numeric) as losing_streak_max,
          AVG(losing_streak::numeric) as losing_streak_avg,
          MIN(winless_streak::numeric) as winless_streak_min,
          MAX(winless_streak::numeric) as winless_streak_max,
          AVG(winless_streak::numeric) as winless_streak_avg
        FROM aggregated_player_profile_stats
        UNION ALL
        SELECT 
          -- Additional streak stats
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
      // Participation uses simple percentage (0-100%), no normalization needed
      participation: {
        min: 0,
        max: 100,
        average: 75 // Typical league attendance
      },
      // Streak normalization
      winStreak: {
        min: Number(rawStats[1]?.win_streak_min || 0),
        max: Number(rawStats[1]?.win_streak_max || 10),
        average: Number(rawStats[1]?.win_streak_avg || 2)
      },
      undefeatedStreak: {
        min: Number(rawStats[1]?.undefeated_streak_min || 0),
        max: Number(rawStats[1]?.undefeated_streak_max || 15),
        average: Number(rawStats[1]?.undefeated_streak_avg || 3)
      },
      losingStreak: {
        min: Number(rawStats[2]?.losing_streak_min || 0),
        max: Number(rawStats[2]?.losing_streak_max || 10),
        average: Number(rawStats[2]?.losing_streak_avg || 1)
      },
      winlessStreak: {
        min: Number(rawStats[2]?.winless_streak_min || 0),
        max: Number(rawStats[2]?.winless_streak_max || 15),
        average: Number(rawStats[2]?.winless_streak_avg || 2)
      },
      attendanceStreak: {
        min: Number(rawStats[3]?.attendance_streak_min || 0),
        max: Number(rawStats[3]?.attendance_streak_max || 30),
        average: Number(rawStats[3]?.attendance_streak_avg || 5)
      }
    };

    // Process streak records from aggregated_records
    let streakRecords = {
      winStreak: { max: 10, holders: [] },
      losingStreak: { max: 5, holders: [] },
      undefeatedStreak: { max: 15, holders: [] },
      winlessStreak: { max: 8, holders: [] },
      scoringStreak: { max: 8, holders: [] },
      attendanceStreak: { max: 25, holders: [] }
    };

    if (records && records.records) {
      const recordData = records.records as any;
      if (recordData.streaks) {
        streakRecords = {
          winStreak: recordData.streaks.win_streak || streakRecords.winStreak,
          losingStreak: recordData.streaks.losing_streak || streakRecords.losingStreak,
          undefeatedStreak: recordData.streaks.undefeated_streak || streakRecords.undefeatedStreak,
          winlessStreak: recordData.streaks.winless_streak || streakRecords.winlessStreak,
          scoringStreak: recordData.streaks.scoring_streak || streakRecords.scoringStreak,
          attendanceStreak: recordData.streaks.attendance_streak || streakRecords.attendanceStreak
        };
      }
    }

    // Process yearly stats
    const yearlyStatsRaw = profile.yearly_stats;
    let yearlyStatsArray: any[] = [];
    
    if (yearlyStatsRaw) {
      try {
        if (Array.isArray(yearlyStatsRaw)) {
          yearlyStatsArray = yearlyStatsRaw;
        } else if (typeof yearlyStatsRaw === 'string') {
          yearlyStatsArray = JSON.parse(yearlyStatsRaw);
        } else {
          yearlyStatsArray = [yearlyStatsRaw];
        }
      } catch (parseError) {
        console.error('Error parsing yearly_stats:', parseError);
        yearlyStatsArray = [];
      }
    }

    // Fetch participation data from historical blocks (for 3rd metric)
    let participationPercentage = 50; // Default fallback
    
    try {
      const halfSeasonData = await prisma.aggregated_half_season_stats.findUnique({
        where: { player_id: numericId },
        select: { historical_blocks: true } as any
      }) as any;

      if (halfSeasonData?.historical_blocks && Array.isArray(halfSeasonData.historical_blocks)) {
        // Get the most recent block with participation data
        const recentBlocks = halfSeasonData.historical_blocks as any[];
        const latestBlock = recentBlocks
          .filter(block => block.participation_rate !== undefined)
          .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
        
        if (latestBlock && latestBlock.participation_rate !== undefined) {
          participationPercentage = Math.round(latestBlock.participation_rate * 100);
        }
      }
    } catch (participationError) {
      console.warn('Could not fetch participation data:', participationError);
    }

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
        
        // NEW: 2-metric power ratings + participation
        power_ratings: powerRatings ? {
          trend_rating: Number((powerRatings as any).trend_rating || 0),
          trend_goal_threat: Number((powerRatings as any).trend_goal_threat || 0),
          participation_percentage: participationPercentage,
          league_avg_goal_threat: Number((powerRatings as any).league_avg_goal_threat || 0),
          updated_at: powerRatings.updated_at
        } : {
          trend_rating: 0,
          trend_goal_threat: 0,
          participation_percentage: participationPercentage,
          league_avg_goal_threat: 0,
          updated_at: null
        },
        
        // NEW: League normalization data for frontend (2-metric + participation)
        league_normalization: leagueNormalization,
        
        // NEW: Streak records for max values
        streak_records: streakRecords,
        
        // Current streak status
        current_streaks: currentStreaks ? {
          active_streaks: currentStreaks.streaks || {},
          active_goal_streaks: currentStreaks.goal_streaks || {},
          last_updated: currentStreaks.match_date
        } : null
    };

    return NextResponse.json({ 
      success: true, 
      data: responseData 
    });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}