import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    // Multi-tenant: Get tenant context for scoped queries
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    console.log('Fetching league averages...');

    // Get all player profile stats with yearly_stats JSON
    const playerStats = await prisma.aggregated_player_profile_stats.findMany({
      where: { tenant_id: tenantId },
      select: {
        yearly_stats: true
      }
    });

    console.log(`Found ${playerStats.length} player profile records`);

    // Extract and aggregate yearly data
    const yearlyData: { [year: string]: { 
      games: number[], 
      goals: number[], 
      mpg: number[], 
      ppg: number[] 
    } } = {};

    playerStats.forEach(player => {
      if (player.yearly_stats && Array.isArray(player.yearly_stats)) {
        player.yearly_stats.forEach((yearStat: any) => {
          const year = yearStat.year?.toString();
          if (!year) return;

          if (!yearlyData[year]) {
            yearlyData[year] = { games: [], goals: [], mpg: [], ppg: [] };
          }

          // Collect values for averaging
          if (typeof yearStat.games_played === 'number' && yearStat.games_played > 0) {
            yearlyData[year].games.push(yearStat.games_played);
          }
          
          if (typeof yearStat.goals_scored === 'number' && yearStat.goals_scored >= 0) {
            yearlyData[year].goals.push(yearStat.goals_scored);
          }
          
          if (typeof yearStat.minutes_per_goal === 'number' && yearStat.minutes_per_goal > 0) {
            yearlyData[year].mpg.push(yearStat.minutes_per_goal);
          }
          
          if (typeof yearStat.points_per_game === 'number' && yearStat.points_per_game >= 0) {
            yearlyData[year].ppg.push(yearStat.points_per_game);
          }
        });
      }
    });

    // Calculate averages for each year
    const leagueAverages = Object.keys(yearlyData).map(year => {
      const data = yearlyData[year];
      
      return {
        year: parseInt(year),
        games_played_avg: data.games.length > 0 ? 
          data.games.reduce((sum, val) => sum + val, 0) / data.games.length : 0,
        goals_scored_avg: data.goals.length > 0 ? 
          data.goals.reduce((sum, val) => sum + val, 0) / data.goals.length : 0,
        minutes_per_goal_avg: data.mpg.length > 0 ? 
          data.mpg.reduce((sum, val) => sum + val, 0) / data.mpg.length : 0,
        points_per_game_avg: data.ppg.length > 0 ? 
          data.ppg.reduce((sum, val) => sum + val, 0) / data.ppg.length : 0
      };
    }).sort((a, b) => a.year - b.year);

    console.log('League averages calculated:', leagueAverages);

    return NextResponse.json({
      averages: leagueAverages,
      totalPlayers: playerStats.length,
      yearsWithData: leagueAverages.length
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Cookie'
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
} 