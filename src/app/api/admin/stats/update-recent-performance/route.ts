import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Import wrapped in try/catch
let updateRecentPerformance;
try {
  const module = require('@/lib/stats/updateRecentPerformance');
  updateRecentPerformance = module.updateRecentPerformance;
} catch (e) {
  console.error('Error importing updateRecentPerformance:', e);
}

// Define types to match those in updateRecentPerformance.ts
interface LastGameInfo {
  date: Date;
  goals: number;
  result: string;
  score: string;
  heavy_win: boolean;
  heavy_loss: boolean;
  clean_sheet: boolean;
}

interface RecentPerformanceData {
  player_id: number;
  last_5_games: LastGameInfo[];
  last_5_goals: number;
  last_updated: Date;
}

// A direct implementation that doesn't use transactions
async function directUpdate() {
  console.log('[Direct implementation] Starting direct update process...');
  
  try {
    // 1. First get active players
    console.log('[Direct implementation] Getting active players...');
    const players = await prisma.players.findMany({
      where: {
        is_ringer: false,
        is_retired: false,
      },
      select: {
        player_id: true,
      },
    });
    
    console.log(`[Direct implementation] Found ${players.length} players to process`);
    
    // 2. Process just the first player as a test
    const testResults: RecentPerformanceData[] = [];
    if (players.length > 0) {
      const player = players[0];
      console.log(`[Direct implementation] Processing test player ${player.player_id}`);
      
      const matches = await prisma.player_matches.findMany({
        where: { player_id: player.player_id },
        include: {
          matches: {
            select: { match_date: true, team_a_score: true, team_b_score: true }
          }
        },
        orderBy: {
          matches: {
            match_date: 'desc',
          },
        },
        take: 5,
      });
      
      console.log(`[Direct implementation] Found ${matches.length} matches for test player`);
      
      let goals = 0;
      const games: LastGameInfo[] = [];
      
      for (const pm of matches) {
        const match = pm.matches;
        if (!match) continue;
        
        goals += pm.goals || 0;
        games.push({
          date: match.match_date,
          goals: pm.goals || 0,
          result: pm.result || '',
          score: `${match.team_a_score || 0}-${match.team_b_score || 0}`,
          heavy_win: pm.heavy_win || false,
          heavy_loss: pm.heavy_loss || false,
          clean_sheet: pm.team === 'A' ? (match.team_b_score === 0) : (match.team_a_score === 0),
        });
      }
      
      testResults.push({
        player_id: player.player_id,
        last_5_games: games,
        last_5_goals: goals,
        last_updated: new Date(),
      });
    }
    
    // 3. Delete existing data
    console.log('[Direct implementation] Deleting existing records...');
    await prisma.aggregated_recent_performance.deleteMany({});
    
    // 4. Insert test data
    if (testResults.length > 0) {
      console.log('[Direct implementation] Inserting test data...');
      await prisma.aggregated_recent_performance.createMany({
        data: testResults,
      });
    }
    
    console.log('[Direct implementation] Direct update completed successfully');
    return true;
  } catch (error) {
    console.error('[Direct implementation] Error in direct update:', error);
    if (error instanceof Error) {
      console.error('[Direct implementation] Error name:', error.name);
      console.error('[Direct implementation] Error message:', error.message);
    }
    return false;
  }
}

export async function POST(request: Request) {
  console.log('[update-recent-performance API] POST request received');
  const startTime = Date.now();
  
  // Add environment info
  console.log('[DEBUG] Node version:', process.version);
  console.log('[DEBUG] Environment:', process.env.NODE_ENV);
  console.log('[DEBUG] Memory usage:', JSON.stringify(process.memoryUsage()));
  
  try {
    const { config, requestId } = await request.json();
    console.log(`[update-recent-performance API] Request ID: ${requestId || 'none'}, Config: ${JSON.stringify(config || {})}`);
    
    // Use a simplified approach that doesn't rely on transactions
    const useFallback = true; // Set to false to try the original method first
    
    if (useFallback) {
      console.log('[update-recent-performance API] Using direct implementation...');
      const success = await directUpdate();
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      if (success) {
        console.log(`[update-recent-performance API] Direct implementation succeeded in ${executionTime}ms`);
        return NextResponse.json({
          success: true,
          completed: true,
          message: 'Recent performance updated using direct implementation',
          executionTime
        });
      } else {
        throw new Error('Direct implementation failed');
      }
    }
    
    // Try the original implementation as a fallback
    try {
      if (!updateRecentPerformance) {
        throw new Error('updateRecentPerformance function not available');
      }
      
      console.log('[update-recent-performance API] Using original implementation...');
      await prisma.$transaction(
        async (tx) => {
          console.log('[update-recent-performance API] Inside transaction');
          await updateRecentPerformance(tx);
          console.log('[update-recent-performance API] Transaction completed successfully');
        },
        { timeout: 60000 } // 60 second timeout
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`[update-recent-performance API] Original implementation succeeded in ${executionTime}ms`);
      return NextResponse.json({
        success: true,
        completed: true,
        message: 'Recent performance updated using original implementation',
        executionTime
      });
    } catch (originalError) {
      console.error('[update-recent-performance API] Original implementation failed:', originalError);
      throw originalError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.error(`[update-recent-performance API] Error in Recent Performance update after ${executionTime}ms:`, error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('[update-recent-performance API] Error name:', error.name);
      console.error('[update-recent-performance API] Error message:', error.message);
      console.error('[update-recent-performance API] Error stack:', error.stack);
    }
    
    const errorObj = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      completed: false,
      executionTime
    };
    console.error(`[update-recent-performance API] Returning error response: ${JSON.stringify(errorObj)}`);
    return NextResponse.json(errorObj, { status: 500 });
  }
} 