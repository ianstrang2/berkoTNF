import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { balanceByRating } from './balanceByRating';
import { balanceByPerformance } from './balanceByPerformance';
import { splitSizesFromPool } from '@/utils/teamSplit.util';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, playerIds, method, state_version } = body;

    if (!matchId || !playerIds || !method) {
      return NextResponse.json({ success: false, error: 'matchId, playerIds, and method are required' }, { status: 400 });
    }

    // Get match info including actual team sizes
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: parseInt(matchId) },
      select: { 
        actual_size_a: true, 
        actual_size_b: true, 
        team_size: true,
        state: true 
      }
    });
    
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    // Use actual sizes as source of truth if available, otherwise calculate
    let sizeA, sizeB;
    if (match.actual_size_a && match.actual_size_b) {
      sizeA = match.actual_size_a;
      sizeB = match.actual_size_b;
    } else {
      const sizes = splitSizesFromPool(playerIds.length);
      sizeA = sizes.a;
      sizeB = sizes.b;
    }
    
    const isUneven = sizeA !== sizeB;
    const isSimplified = (sizeA + sizeB) === 8;
    
    // Block Ability balancing for ANY uneven team (4v4 or larger splits like 4v5, 5v6)
    if (method === 'balanceByRating' && (isUneven || isSimplified)) {
      return NextResponse.json({
        success: false,
        error: 'Ability balancing not supported for uneven teams. Use Performance or Random.',
      }, { status: 400 });
    }

    // Ensure playerIds are strings for consistent processing in helpers
    const playerIdsAsStrings = playerIds.map((id: any) => String(id));

    let result;
    if (method === 'balanceByRating') {
      result = await balanceByRating(matchId, { a: sizeA, b: sizeB }, state_version);
    } else if (method === 'balanceByPerformance') {
      result = await balanceByPerformance(matchId, playerIdsAsStrings, { a: sizeA, b: sizeB }, state_version);
    } else if (method === 'random') {
      // Call the existing random balance endpoint directly
      const baseUrl = new URL(request.url).origin;
      const randomUrl = `${baseUrl}/api/admin/random-balance-match?matchId=${matchId}`;
      
      console.log('Calling random balance URL:', randomUrl);
      
      const randomResponse = await fetch(randomUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const randomData = await randomResponse.json();
      
      console.log('Random balance response:', randomData);
      
      if (!randomData.success) {
        return NextResponse.json({ success: false, error: randomData.error }, { status: randomResponse.status });
      }
      
      result = randomData.data;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid balancing method' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error(`Error balancing teams with method:`, error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 