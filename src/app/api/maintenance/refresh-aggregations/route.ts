import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Refreshing pre-aggregated data...');
    
    // Clear all caches
    apiCache.clear();
    
    // Execute stored procedures for refreshing aggregated data
    await prisma.$executeRaw`
      UPDATE season_stats ss
      SET
        games_played = subquery.games_played,
        wins = subquery.wins,
        draws = subquery.draws,
        losses = subquery.losses,
        goals = subquery.goals,
        win_percentage = CASE WHEN subquery.games_played > 0 THEN (subquery.wins::float / subquery.games_played * 100) ELSE 0 END,
        minutes_per_goal = CASE WHEN subquery.goals > 0 THEN (subquery.games_played * 60.0 / subquery.goals) ELSE null END,
        heavy_wins = subquery.heavy_wins,
        heavy_win_percentage = CASE WHEN subquery.games_played > 0 THEN (subquery.heavy_wins::float / subquery.games_played * 100) ELSE 0 END,
        heavy_losses = subquery.heavy_losses,
        heavy_loss_percentage = CASE WHEN subquery.games_played > 0 THEN (subquery.heavy_losses::float / subquery.games_played * 100) ELSE 0 END,
        clean_sheets = subquery.clean_sheets,
        clean_sheet_percentage = CASE WHEN subquery.games_played > 0 THEN (subquery.clean_sheets::float / subquery.games_played * 100) ELSE 0 END,
        fantasy_points = subquery.fantasy_points,
        points_per_game = CASE WHEN subquery.games_played > 0 THEN (subquery.fantasy_points::float / subquery.games_played) ELSE 0 END,
        last_updated = NOW()
      FROM (
        SELECT 
          pm.player_id,
          COUNT(*) as games_played,
          COUNT(*) FILTER (WHERE pm.result = 'win') as wins,
          COUNT(*) FILTER (WHERE pm.result = 'draw') as draws,
          COUNT(*) FILTER (WHERE pm.result = 'loss') as losses,
          SUM(pm.goals) as goals,
          COUNT(*) FILTER (WHERE pm.heavy_win = true) as heavy_wins,
          COUNT(*) FILTER (WHERE pm.heavy_loss = true) as heavy_losses,
          COUNT(*) FILTER (WHERE pm.clean_sheet = true) as clean_sheets,
          SUM(
            CASE 
              WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
              WHEN pm.result = 'win' THEN 20
              WHEN pm.result = 'draw' THEN 10
              WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
              WHEN pm.result = 'loss' THEN -10
              ELSE 0 
            END
          ) as fantasy_points
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.match_date >= (NOW() - INTERVAL '6 months')
        GROUP BY pm.player_id
      ) as subquery
      WHERE ss.player_id = subquery.player_id;
    `;
    await prisma.$executeRaw`SELECT update_all_time_stats();`;
    
    // Update cache metadata timestamps
    const now = new Date();
    await prisma.$transaction([
      prisma.cache_metadata.updateMany({
        data: { last_invalidated: now }
      })
    ]);
    
    console.log('Pre-aggregated data refresh completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pre-aggregated data refreshed successfully',
      timestamp: now
    });
  } catch (error) {
    console.error('Error refreshing pre-aggregated data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh pre-aggregated data',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 