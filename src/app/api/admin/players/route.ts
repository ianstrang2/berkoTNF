import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerProfile } from '@/lib/transform/player.transform';
// Multi-tenant imports - ensuring admin routes are tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

// Get all players
export async function GET(request: Request) {
  try {
    // Multi-tenant setup - ensure admin operations are tenant-scoped
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const url = new URL(request.url);
    const includeMatchCounts = url.searchParams.get('include_match_counts') === 'true';
    const showRetired = url.searchParams.get('show_retired') === 'true';
    
    let players;
    
    if (includeMatchCounts) {
      // Fetch players with match counts - conditionally include retired players
      // Multi-tenant: Adding tenant_id filter to raw queries for data isolation
      if (showRetired) {
        players = await prisma.$queryRaw`
          SELECT 
            p.*,
            COUNT(pm.player_match_id)::integer as matches_played
          FROM 
            players p
          LEFT JOIN 
            player_matches pm ON p.player_id = pm.player_id AND pm.tenant_id = ${tenantId}::uuid
          WHERE p.tenant_id = ${tenantId}::uuid
          GROUP BY 
            p.player_id
          ORDER BY 
            p.name ASC
        `;
      } else {
        players = await prisma.$queryRaw`
          SELECT 
            p.*,
            COUNT(pm.player_match_id)::integer as matches_played
          FROM 
            players p
          LEFT JOIN 
            player_matches pm ON p.player_id = pm.player_id AND pm.tenant_id = ${tenantId}::uuid
          WHERE p.tenant_id = ${tenantId}::uuid AND p.is_retired = false
          GROUP BY 
            p.player_id
          ORDER BY 
            p.name ASC
        `;
      }
    } else {
      // Just fetch players without match counts - conditionally include retired players
      // Multi-tenant: Using tenant-scoped query for data isolation
      const whereClause = showRetired ? { tenant_id: tenantId } : { tenant_id: tenantId, is_retired: false };
      players = await prisma.players.findMany({
        where: whereClause,
        orderBy: {
          name: 'asc',
        },
      });
    }
    
    // Transform the raw database data to canonical format
    const transformedPlayers = players.map(player => ({
      ...toPlayerProfile(player),
      // Preserve the matches_played field if it exists (from the raw query)
      ...(player.matches_played !== undefined && { matches_played: player.matches_played })
    }));
    
    return new NextResponse(JSON.stringify({ 
      success: true,
      data: serializeData(transformedPlayers) 
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
    // Multi-tenant setup - ensure new players are created in the correct tenant
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const body = await request.json();
    const {
      name,
      phone,
      isAdmin,
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
      phone: phone || null,
      is_admin: isAdmin || false,
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

    // Multi-tenant: Create player in the current tenant
    const player = await prisma.players.create({
      data: { ...createData, tenant_id: tenantId },
    });
    
    // Transform the created player to canonical format
    const transformedPlayer = toPlayerProfile(player);
    return NextResponse.json({ data: serializeData(transformedPlayer) });
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
    // Multi-tenant setup - ensure player updates are tenant-scoped
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const body = await request.json();
    const { 
      player_id, 
      name,
      phone,
      isAdmin,
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

    // Get current player data to check if phone is changing
    const currentPlayer = await prisma.players.findUnique({
      where: { player_id: Number(player_id) },
      select: { phone: true, auth_user_id: true, name: true }
    });

    // Construct data payload for Prisma update
    // We explicitly list fields to ensure type safety and to avoid passing undefined values for fields not being updated (though our client sends all)
    const updateData: {
      name?: string;
      phone?: string | null;
      auth_user_id?: string | null;
      is_admin?: boolean;
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
    if (phone !== undefined) {
      updateData.phone = phone || null;
      
      // If phone number changed and player was linked, unlink auth
      if (currentPlayer && phone !== currentPlayer.phone && currentPlayer.auth_user_id) {
        updateData.auth_user_id = null;
        console.log(`[PLAYERS] Phone changed for ${currentPlayer.name} - auth_user_id cleared. Player must re-claim with new number.`);
      }
    }
    if (isAdmin !== undefined) updateData.is_admin = isAdmin;
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

    // Multi-tenant: Update player within the current tenant only
    const player = await prisma.players.update({
      where: {
        player_id: Number(player_id), // Ensure player_id is a number if schema expects Int
        tenant_id: tenantId
      },
      data: updateData,
    });
    
    // Transform the updated player to canonical format
    const transformedPlayer = toPlayerProfile(player);
    return NextResponse.json({ data: serializeData(transformedPlayer) });
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
