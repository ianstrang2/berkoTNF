import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match creation is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// POST: Create a real match from a planned match
export async function POST(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure match creation is tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const body = await request.json();
    // Accept either field name for compatibility
    const { match_id, upcoming_match_id } = body;
    
    // Use upcoming_match_id if provided, fallback to match_id
    let targetMatchId = upcoming_match_id || match_id;
    
    // If no match ID provided, use the active match
    if (!targetMatchId) {
      // Multi-tenant: Query scoped to current tenant only
      const activeMatch = await prisma.upcoming_matches.findFirst({
        where: { is_active: true, tenant_id: tenantId },
        select: { upcoming_match_id: true }
      });
      
      if (!activeMatch) {
        return NextResponse.json({
          success: false,
          error: 'No active match found'
        }, { status: 404 });
      }
      
      targetMatchId = activeMatch.upcoming_match_id;
    }

    // Fetch match details
    // Multi-tenant: Query scoped to current tenant only
    const plannedMatch = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: targetMatchId, tenant_id: tenantId },
      include: {
        upcoming_match_players: {
          where: { tenant_id: tenantId },
          include: {
            players: true
          }
        }
      }
    });

    if (!plannedMatch) {
      return NextResponse.json({ 
        success: false, 
        error: 'Planned match not found' 
      }, { status: 404 });
    }

    // Check if match is balanced
    if (!plannedMatch.is_balanced) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match must be balanced before creating a match report' 
      }, { status: 400 });
    }

    // Check if there are player assignments
    if (!(plannedMatch as any).upcoming_match_players || (plannedMatch as any).upcoming_match_players.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No player assignments found for this match' 
      }, { status: 400 });
    }

    // Create match record
    // Multi-tenant: Create match in current tenant
    const newMatch = await prisma.matches.create({
      data: {
        tenant_id: tenantId,
        match_date: plannedMatch.match_date,
        team_a_score: 0,
        team_b_score: 0,
        season_id: null
      }
    });

    // Create player match records
    const playerPromises = (plannedMatch as any).upcoming_match_players.map(player => {
      const teamName = player.team || 'A'; // Default to team A if not assigned
      
      // Multi-tenant: Create player match record in current tenant
      return prisma.player_matches.create({
        data: {
          tenant_id: tenantId,
          match_id: newMatch.match_id,
          player_id: player.player_id,
          team: teamName,
          goals: 0,
          clean_sheet: true, // Both teams have 0 goals
          // REMOVED: heavy_win and heavy_loss - calculated from goal_difference in SQL
          result: 'draw' // Initial result is a draw since scores are 0-0
        }
      });
    });
    
    await Promise.all(playerPromises);
    
    return NextResponse.json({
      success: true,
      data: {
        match_id: newMatch.match_id,
        player_count: (plannedMatch as any).upcoming_match_players.length
      },
      message: 'Match created successfully'
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 