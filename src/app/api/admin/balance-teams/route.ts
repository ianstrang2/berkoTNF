import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { balanceByRating } from './balanceByRating';
import { balanceByPerformance } from './balanceByPerformance';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, playerIds, method } = body;

    if (!matchId || !playerIds || !method) {
      return NextResponse.json({ success: false, error: 'matchId, playerIds, and method are required' }, { status: 400 });
    }

    // Ensure playerIds are strings for consistent processing in helpers
    const playerIdsAsStrings = playerIds.map((id: any) => String(id));

    let result;
    if (method === 'balanceByRating') {
      result = await balanceByRating(matchId);
    } else if (method === 'balanceByPerformance') {
      result = await balanceByPerformance(matchId, playerIdsAsStrings);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid balancing method' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error(`Error balancing teams with method:`, error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
} 