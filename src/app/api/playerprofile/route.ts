import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// Prevent static generation for this route
export const dynamic = 'force-dynamic';

// Fetch player profile by ID from the aggregated table AND power ratings
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const startTime = Date.now();
    console.log(`🔍 [PROFILE] Fetching player profile for tenant ${tenantId}`);

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
    
    console.log(`🔍 [PROFILE] Fetching aggregated profile for player ID: ${numericId}`);

    // Fetch profile data and power ratings in parallel
    // Multi-tenant: All queries scoped to current tenant
    const parallelStart = Date.now();
    const [profile, teammateStats, playerData, performanceRatings, leagueStats, currentStreaks, records] = await Promise.all([
      // Existing profile query
      prisma.aggregated_player_profile_stats.findUnique({
        where: { player_id: numericId, tenant_id: tenantId },
      }),
      
      // NEW: Fetch teammate stats from separate table
      prisma.aggregated_player_teammate_stats.findUnique({
        where: { player_id: numericId, tenant_id: tenantId },
        select: {
          teammate_chemistry_all: true
        }
      }),
      
      // NEW: Fetch player data including profile_text
      prisma.players.findUnique({
        where: { player_id: numericId, tenant_id: tenantId },
        select: {
          profile_text: true,
          profile_generated_at: true,
          name: true,
          is_retired: true
        }
      }),
      
      // UPDATED: New EWMA performance ratings query
      prisma.aggregated_performance_ratings.findUnique({
        where: { player_id: numericId, tenant_id: tenantId },
        select: {
          power_rating: true,
          goal_threat: true,
          participation: true,
          power_percentile: true,
          goal_percentile: true,
          participation_percentile: true,
          is_qualified: true,
          weighted_played: true,
          first_match_date: true,
          updated_at: true
        }
      }),
      
      // League normalization data (for power ratings and streaks) - EWMA system
      // Multi-tenant: Query scoped to current tenant only
      prisma.$queryRaw`
        SELECT 
          -- Power rating stats (EWMA) - FILTERED for qualified players only
          MIN(power_rating::numeric) as power_rating_min,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY power_rating::numeric) as power_rating_max,  -- Use P90 instead of MAX
          AVG(power_rating::numeric) as power_rating_avg,
          MIN(goal_threat::numeric) as goal_threat_min,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY goal_threat::numeric) as goal_threat_max,  -- Use P90 instead of MAX
          AVG(goal_threat::numeric) as goal_threat_avg
        FROM aggregated_performance_ratings
        WHERE is_qualified = true 
        AND weighted_played >= 5  -- EWMA qualification threshold
        AND tenant_id = ${tenantId}::uuid
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
        WHERE tenant_id = ${tenantId}::uuid
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
        WHERE tenant_id = ${tenantId}::uuid
        UNION ALL
        SELECT 
          -- Additional streak stats
          MIN(attendance_streak::numeric) as attendance_streak_min,
          MAX(attendance_streak::numeric) as attendance_streak_max,
          AVG(attendance_streak::numeric) as attendance_streak_avg,
          0 as placeholder1, 0 as placeholder2, 0 as placeholder3
        FROM aggregated_player_profile_stats
        WHERE tenant_id = ${tenantId}::uuid
      ` as any[],
       
      // Current streaks from latest match report
      // Multi-tenant: Query scoped to current tenant only
      prisma.aggregated_match_report.findFirst({
        where: { tenant_id: tenantId },
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
      // Multi-tenant: Query scoped to current tenant only
      prisma.aggregated_records.findFirst({
        where: { tenant_id: tenantId },
        select: {
          records: true
        }
      })
    ]);
    console.log(`⏱️ [PROFILE] All parallel queries completed: ${Date.now() - parallelStart}ms`);
    console.log(`⏱️ [PROFILE] Query results:`, {
      hasProfile: !!profile,
      hasTeammateStats: !!teammateStats,
      hasPlayerData: !!playerData,
      hasPerformanceRatings: !!performanceRatings,
      leagueStatsRows: (leagueStats as any[]).length,
      hasCurrentStreaks: !!currentStreaks,
      recordsCount: (records as any[]).length
    });

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
    let streakRecords: any = null;

    if (records && records.records) {
      const recordData = records.records as any;
      
      if (recordData.streaks) {
        // Extract max streak values from holders arrays
        const getMaxStreak = (streakData: any) => {
          if (!streakData || !streakData.holders || !Array.isArray(streakData.holders)) return null;
          return Math.max(...streakData.holders.map((h: any) => h.streak));
        };

        streakRecords = {
          winStreak: { max: getMaxStreak(recordData.streaks["Win Streak"]) },
          losingStreak: { max: getMaxStreak(recordData.streaks["Losing Streak"]) },
          undefeatedStreak: { max: getMaxStreak(recordData.streaks["Undefeated Streak"]) },
          winlessStreak: { max: getMaxStreak(recordData.streaks["Winless Streak"]) },
          scoringStreak: { max: getMaxStreak(recordData.streaks["Games Scoring"]) },
          attendanceStreak: { max: getMaxStreak(recordData.streaks["Attendance Streak"]) }
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

    // Fetch participation data from EWMA performance ratings (replaces historical blocks)
    let participationPercentage = 50; // Default fallback
    
    // Note: EWMA participation data is already fetched above in performanceRatings
    // Use that data if available, otherwise fall back to default
    if (performanceRatings && (performanceRatings as any).participation !== undefined) {
      participationPercentage = Math.round(Number((performanceRatings as any).participation));
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
        teammate_chemistry_all: teammateStats?.teammate_chemistry_all || [], // NEW: From separate teammate stats table
        last_updated: profile.last_updated,
        
        // NEW: 3-metric power ratings (EWMA system)
        power_ratings: performanceRatings ? {
          power_rating: (performanceRatings as any).power_rating ? Number((performanceRatings as any).power_rating) : null,
          goal_threat: (performanceRatings as any).goal_threat ? Number((performanceRatings as any).goal_threat) : null,
          participation: (performanceRatings as any).participation ? Number((performanceRatings as any).participation) : participationPercentage,
          power_percentile: (performanceRatings as any).power_percentile ? Number((performanceRatings as any).power_percentile) : null,
          goal_percentile: (performanceRatings as any).goal_percentile ? Number((performanceRatings as any).goal_percentile) : null,
          participation_percentile: (performanceRatings as any).participation_percentile ? Number((performanceRatings as any).participation_percentile) : null,
          is_qualified: (performanceRatings as any).is_qualified,
          weighted_played: (performanceRatings as any).weighted_played,
          first_match_date: (performanceRatings as any).first_match_date,
          updated_at: performanceRatings.updated_at
        } : {
          power_rating: null,
          goal_threat: null,
          participation: participationPercentage,
          power_percentile: null,
          goal_percentile: null,
          participation_percentile: null,
          is_qualified: false,
          weighted_played: 0,
          first_match_date: null,
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
        } : null,
        
        // NEW: AI-generated profile
        profile_text: playerData?.profile_text || null,
        profile_generated_at: playerData?.profile_generated_at || null,
        
        // Player status
        is_retired: playerData?.is_retired || false
    };

    console.log(`⏱️ [PROFILE] ✅ TOTAL TIME: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({ 
      success: true, 
      data: responseData 
    });
  }).catch(handleTenantError);
}