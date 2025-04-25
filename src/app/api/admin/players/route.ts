import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

// Get all players
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeMatchCounts = url.searchParams.get('include_match_counts') === 'true';
    
    let players;
    
    if (includeMatchCounts) {
      // Fetch players with match counts
      players = await prisma.$queryRaw`
        SELECT 
          p.*,
          COUNT(pm.player_match_id)::integer as matches_played
        FROM 
          players p
        LEFT JOIN 
          player_matches pm ON p.player_id = pm.player_id
        GROUP BY 
          p.player_id
        ORDER BY 
          p.name ASC
      `;
    } else {
      // Just fetch players without match counts
      players = await prisma.players.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    }
    
    return new NextResponse(JSON.stringify({ 
      success: true,
      data: serializeData(players) 
    }), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch players', details: error },
      { status: 500 }
    );
  }
}

// Add a new player
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      is_ringer, 
      is_retired,
      goalscoring,
      defender,
      stamina_pace,
      control,
      teamwork,
      resilience 
    } = body;

    const player = await prisma.players.create({
      data: {
        name,
        is_ringer,
        is_retired,
        goalscoring: goalscoring || 3,
        defender: defender || 3,
        stamina_pace: stamina_pace || 3,
        control: control || 3,
        teamwork: teamwork || 3,
        resilience: resilience || 3,
        join_date: new Date(),
      },
    });
    return NextResponse.json({ data: serializeData(player) });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player', details: error },
      { status: 500 }
    );
  }
}

// Update a player
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      player_id, 
      name, 
      is_ringer, 
      is_retired,
      goalscoring,
      defender,
      stamina_pace,
      control,
      teamwork,
      resilience 
    } = body;

    const player = await prisma.players.update({
      where: {
        player_id: player_id,
      },
      data: {
        name,
        is_ringer,
        is_retired,
        goalscoring: goalscoring || 3,
        defender: defender || 3,
        stamina_pace: stamina_pace || 3,
        control: control || 3,
        teamwork: teamwork || 3,
        resilience: resilience || 3,
      },
    });
    return NextResponse.json({ data: serializeData(player) });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player', details: error },
      { status: 500 }
    );
  }
}
