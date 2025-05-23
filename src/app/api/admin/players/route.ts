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
      resilience,
      selected_club // Will be object or null from client if provided, or undefined if not in form
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const createData: any = {
      name,
      is_ringer: is_ringer !== undefined ? is_ringer : false, // Default for new player
      is_retired: is_retired !== undefined ? is_retired : false, // Default for new player
      goalscoring: goalscoring || 3,
      defender: defender || 3,
      stamina_pace: stamina_pace || 3,
      control: control || 3,
      teamwork: teamwork || 3,
      resilience: resilience || 3,
      join_date: new Date(),
      // Only include selected_club if it's not undefined.
      // If selected_club is explicitly null, it will be set to null.
      // If selected_club is an object, it will be set.
      // If selected_club is undefined in body, it won't be included in createData, Prisma uses default (null for Json?)
    };

    if (selected_club !== undefined) {
      createData.selected_club = selected_club;
    }

    const player = await prisma.players.create({
      data: createData,
    });
    return NextResponse.json({ data: serializeData(player) });
  } catch (error: any) {
    console.error('API POST Error in /api/admin/players:', error);
    let errorMessage = 'Failed to create player';
    if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.stack : String(error)
      },
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
      resilience,
      selected_club 
    } = body;

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
    }

    // Construct data payload for Prisma update
    // We explicitly list fields to ensure type safety and to avoid passing undefined values for fields not being updated (though our client sends all)
    const updateData: {
      name?: string;
      is_ringer?: boolean;
      is_retired?: boolean;
      goalscoring?: number;
      defender?: number;
      stamina_pace?: number;
      control?: number;
      teamwork?: number;
      resilience?: number;
      selected_club?: any; // Prisma handles object or null for Json?
    } = {};

    if (name !== undefined) updateData.name = name;
    if (is_ringer !== undefined) updateData.is_ringer = is_ringer;
    if (is_retired !== undefined) updateData.is_retired = is_retired;
    if (goalscoring !== undefined) updateData.goalscoring = goalscoring;
    if (defender !== undefined) updateData.defender = defender;
    if (stamina_pace !== undefined) updateData.stamina_pace = stamina_pace;
    if (control !== undefined) updateData.control = control;
    if (teamwork !== undefined) updateData.teamwork = teamwork;
    if (resilience !== undefined) updateData.resilience = resilience;
    // selected_club can be null, so we assign it if it's explicitly provided in the body
    if (selected_club !== undefined) {
      updateData.selected_club = selected_club;
    }

    const player = await prisma.players.update({
      where: {
        player_id: Number(player_id), // Ensure player_id is a number if schema expects Int
      },
      data: updateData,
    });
    return NextResponse.json({ data: serializeData(player) });
  } catch (error: any) {
    console.error('API PUT Error in /api/admin/players:', error); // Enhanced server-side logging
    let errorMessage = 'Failed to update player';
    if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.stack : String(error) // Send stack or stringified error
      },
      { status: 500 }
    );
  }
}
