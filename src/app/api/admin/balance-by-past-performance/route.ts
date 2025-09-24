import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { balanceByPastPerformance } from './utils'; // Import the helper function
import { createClient } from '@supabase/supabase-js'; // Import createClient
// Multi-tenant imports - ensuring balance by past performance is tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

// POST handler for API route
export async function POST(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure balance by past performance is tenant-scoped
    const tenantId = getCurrentTenantId();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Use SUPABASE_SERVICE_ROLE_KEY consistent with personal-bests/route.ts
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[API /balance-by-past-performance] Missing Supabase environment variables (URL or Service Role Key).');
      return NextResponse.json(
        { success: false, error: 'Server configuration error: Supabase credentials missing.' }, 
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await request.json();
    const { matchId, playerIds } = body; // playerIds expected from client

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }
     if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Player IDs are required and must be a non-empty array' },
        { status: 400 }
      );
    }


    const matchIdInt = parseInt(matchId as string, 10);
    if (isNaN(matchIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid match ID' },
        { status: 400 }
      );
    }

    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: matchIdInt },
      select: { team_size: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }
    
    const teamSize = match.team_size;
    const totalPlayersNeeded = teamSize * 2;

    if (playerIds.length < totalPlayersNeeded) {
         return NextResponse.json(
           { success: false, error: `Not enough players selected. Need ${totalPlayersNeeded}, have ${playerIds.length}.`},
           { status: 400 }
         );
    }
    
    // If more players than needed, take the first totalPlayersNeeded (already sorted by score in util)
    // Or ensure util handles if it receives more and only uses top N for balancing
    const playersForBalancing = playerIds.slice(0, totalPlayersNeeded);


    const result = await balanceByPastPerformance(supabase, playersForBalancing.map(id => Number(id)));

    // Delete existing slot assignments
    await prisma.upcoming_match_players.deleteMany({
      where: { upcoming_match_id: matchIdInt, tenant_id: tenantId },
    });

    // Create new slot assignments
    const teamAAssignments = result.teamA.map((pId, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: pId,
      team: 'A',
      slot_number: index + 1,
      tenant_id: tenantId,
    }));

    const teamBAssignments = result.teamB.map((pId, index) => ({
      upcoming_match_id: matchIdInt,
      player_id: pId,
      team: 'B',
      slot_number: teamSize + index + 1,
      tenant_id: tenantId,
    }));

    await prisma.upcoming_match_players.createMany({
      data: [...teamAAssignments, ...teamBAssignments],
    });

    // Mark match as balanced
    await prisma.upcoming_matches.update({
      where: { upcoming_match_id: matchIdInt },
      data: { is_balanced: true },
    });
    
    // Fetch full slot details for the response
    const updatedAssignments = await prisma.upcoming_match_players.findMany({
        where: { upcoming_match_id: matchIdInt },
        include: {
            player: {
                select: {
                    name: true,
                    // Include other relevant player fields if needed in response
                }
            }
        },
        orderBy: { slot_number: 'asc' }
    });

    const formattedSlots = updatedAssignments.map(assignment => ({
        slot_number: assignment.slot_number,
        player_id: assignment.player_id.toString(),
        team: assignment.team,
        name: assignment.player.name,
        // Add other player details if needed
    }));


    return NextResponse.json({
      success: true,
      data: {
        slots: formattedSlots, // Or just teamA and teamB IDs if preferred
        is_balanced: true,
        balanceType: 'pastPerformance',
        balancePercent: result.balancePercent
      }
    });

  } catch (error: any) {
    console.error('Error balancing teams by past performance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 