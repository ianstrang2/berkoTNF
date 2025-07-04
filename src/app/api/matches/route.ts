import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-static';  // Ensures the route is statically exported
export const revalidate = 30;           // Revalidate every 30 seconds (adjust as needed)

export async function GET() {
  try {
    console.log('Attempting to fetch matches...')
    const matches = await prisma.matches.findMany({
      take: 5,
      orderBy: {
        match_date: 'desc'
      },
      include: {
        player_matches: {
          include: {
            players: true
          }
        }
      }
    })
    console.log('Matches fetched:', matches)
    return NextResponse.json({ data: matches })
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches', details: error },
      { status: 500 }
    )
  }
}

// Add a new match
export async function POST(request: Request) {
  try {
    console.log('Attempting to create match...')
    const body = await request.json()
    const { match_date, team_a_score, team_b_score, player_matches } = body

    // Calculate match result metrics for legacy compatibility
    const scoreDiff = Math.abs(team_a_score - team_b_score);
    const isHeavyWin = scoreDiff >= 4;
    
    console.log(`LEGACY MATCH CREATION: Score ${team_a_score}-${team_b_score}, ScoreDiff: ${scoreDiff}, IsHeavyWin: ${isHeavyWin}`);
    
    // Add result calculations to player_matches data if missing
    const enhancedPlayerMatches = player_matches.map((pm: any) => {
      // Skip if already has result fields calculated
      if (pm.result) {
        console.log(`Player ${pm.player_id} already has result fields`);
        return pm;
      }
      
      // Calculate team and opposing scores
      const teamScore = pm.team === 'A' ? team_a_score : team_b_score;
      const opposingScore = pm.team === 'A' ? team_b_score : team_a_score;
      
      // Calculate result fields
      const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');
      const heavy_win = result === 'win' && isHeavyWin;
      const heavy_loss = result === 'loss' && isHeavyWin;
      const clean_sheet = opposingScore === 0;
      
      console.log(`LEGACY: Player ${pm.player_id} (Team ${pm.team}): result=${result}, heavy_win=${heavy_win}, heavy_loss=${heavy_loss}, clean_sheet=${clean_sheet}`);
      
      return {
        ...pm,
        result,
        heavy_win,
        heavy_loss,
        clean_sheet,
      };
    });

    const match = await prisma.matches.create({
      data: {
        match_date: new Date(match_date),
        team_a_score,
        team_b_score,
        player_matches: {
          create: enhancedPlayerMatches
        }
      },
      include: {
        player_matches: {
          include: {
            players: true
          }
        }
      }
    })
    console.log('Legacy match created with calculated result fields:', match)
    
    // Trigger stats recalculation for legacy matches too
    try {
      console.log('TRIGGERING STATS UPDATE for legacy match');
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const statsResponse = await fetch(new URL('/api/admin/trigger-stats-update', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (statsResponse.ok) {
        console.log('LEGACY STATS UPDATE triggered successfully');
      } else {
        console.warn('LEGACY STATS UPDATE failed:', await statsResponse.text());
      }
    } catch (statsError) {
      console.warn('LEGACY STATS UPDATE error (non-critical):', statsError);
    }
    
    return NextResponse.json({ data: match })
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json(
      { error: 'Failed to create match', details: error },
      { status: 500 }
    )
  }
}