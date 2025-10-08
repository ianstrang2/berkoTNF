import { NextRequest, NextResponse } from 'next/server';
import { handleTenantError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma'; // Assuming prisma client is here

// Helper to serialize BigInt if present (though less likely in this specific query result)
const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  const { playerId } = params;

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
  }

  const numericPlayerId = parseInt(playerId, 10);

  if (isNaN(numericPlayerId)) {
    return NextResponse.json({ error: 'Invalid Player ID' }, { status: 400 });
  }

  try {
    const playerMatches = await prisma.player_matches.findMany({
      where: {
        player_id: numericPlayerId,
      },
      include: {
        matches: { // This assumes a relation named 'matches' is defined in your Prisma schema
          select: {
            match_date: true,
          },
        },
      },
      orderBy: {
        matches: {
          match_date: 'asc', // Order by match_date from the related matches table
        },
      },
    });

    if (!playerMatches) {
      return NextResponse.json({ matches: [] }, { status: 200 });
    }

    const formattedMatches = playerMatches.map(pm => ({
      // Ensure pm.matches exists and is not null before accessing match_date
      date: pm.matches?.match_date ? new Date(pm.matches.match_date).toISOString().split('T')[0] : null, 
      goals: pm.goals,
      result: pm.result ? pm.result.toLowerCase() : null, 
    })).filter(match => match.date !== null); // Filter out any matches where date couldn't be determined
    
    // The Prisma query should already order it, but an explicit sort here is a good safety net if needed.
    // formattedMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ matches: serializeData(formattedMatches) }, { status: 200 });

  } catch (err: any) {
    console.error('Error fetching all player matches with Prisma:', err);
    return NextResponse.json({ error: 'Failed to fetch all player matches', details: err.message }, { status: 500 });
  }
} 