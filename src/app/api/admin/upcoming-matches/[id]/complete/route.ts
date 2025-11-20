import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match completion is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantMatchLock } from '@/lib/tenantLocks';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

/**
 * API route to complete a match.
 * Accepts final score, own goals, and player stats, creates the historical match record,
 * and transitions the upcoming_match state to 'Completed'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // SECURITY: Verify admin access
      await requireAdminRole(request);
      const matchId = parseInt(params.id, 10);
      const { state_version, score, own_goals, player_stats } = await request.json();

      if (isNaN(matchId)) {
        return NextResponse.json({ success: false, error: 'Invalid Match ID' }, { status: 400 });
      }
      if (typeof state_version !== 'number') {
        return NextResponse.json({ success: false, error: 'state_version is required' }, { status: 400 });
      }
      if (!score || typeof score.team_a !== 'number' || typeof score.team_b !== 'number') {
        return NextResponse.json({ success: false, error: 'Valid score object is required' }, { status: 400 });
      }
      if (!own_goals || typeof own_goals.team_a !== 'number' || typeof own_goals.team_b !== 'number') {
        return NextResponse.json({ success: false, error: 'Valid own_goals object is required' }, { status: 400 });
      }
      if (own_goals.team_a < 0 || own_goals.team_b < 0) {
        return NextResponse.json({ success: false, error: 'Own goals cannot be negative' }, { status: 400 });
      }
      if (!Array.isArray(player_stats)) {
        return NextResponse.json({ success: false, error: 'player_stats must be an array' }, { status: 400 });
      }

      // Validate score integrity: team_score should equal player_goals + own_goals
      // First, get team assignments from database to properly validate
      // Multi-tenant: Query scoped to current tenant only
      const upcomingMatchForValidation = await prisma.upcoming_matches.findUnique({
        where: { upcoming_match_id: matchId, tenant_id: tenantId },
        include: { upcoming_match_players: true },
      });
      
      if (!upcomingMatchForValidation) {
        return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
      }
      
      // Calculate total goals by team using ACTUAL team assignments (respects swaps)
      // Note: player_stats only contains players who played (no-shows filtered out in UI)
      const totalPlayerGoalsA = player_stats
        .filter(p => (p.actual_team || p.team) === 'A')
        .reduce((sum, p) => sum + (p.goals || 0), 0);
      const totalPlayerGoalsB = player_stats
        .filter(p => (p.actual_team || p.team) === 'B')
        .reduce((sum, p) => sum + (p.goals || 0), 0);
      
      if (score.team_a !== totalPlayerGoalsA + own_goals.team_a) {
        return NextResponse.json({ 
          success: false, 
          error: `Team A score validation failed: ${score.team_a} ≠ ${totalPlayerGoalsA} (player goals) + ${own_goals.team_a} (own goals)` 
        }, { status: 400 });
      }
      if (score.team_b !== totalPlayerGoalsB + own_goals.team_b) {
        return NextResponse.json({ 
          success: false, 
          error: `Team B score validation failed: ${score.team_b} ≠ ${totalPlayerGoalsB} (player goals) + ${own_goals.team_b} (own goals)` 
        }, { status: 400 });
      }

      // Additional state validation before transaction
      if ((upcomingMatchForValidation as any).state !== 'TeamsBalanced') {
        return NextResponse.json({ 
          success: false, 
          error: `Cannot complete match with state ${(upcomingMatchForValidation as any).state}.` 
        }, { status: 400 });
      }
      if ((upcomingMatchForValidation as any).state_version !== state_version) {
        return NextResponse.json({ 
          success: false, 
          error: 'Conflict: Match has been updated by someone else.' 
        }, { status: 409 });
      }

      // Multi-tenant: Use tenant-aware transaction with advisory locking
      const completedMatch = await withTenantMatchLock(tenantId, matchId, async (tx) => {
        // Use the already-fetched match data
        const upcomingMatch = upcomingMatchForValidation;

        // 1. Create the historical match record with own goals (tenant-scoped)
        const newMatch = await tx.matches.create({
          data: {
            match_date: upcomingMatch.match_date,
            team_a_score: score.team_a,
            team_b_score: score.team_b,
            team_a_own_goals: own_goals.team_a,
            season_id: null,
            team_b_own_goals: own_goals.team_b,
            upcoming_match_id: matchId,
            tenant_id: tenantId  // Multi-tenant: Include tenant in new match record
          } as any,
        });

        // 2. Create player_matches records with calculated result fields
        // Note: player_stats only contains players who actually played (no-shows excluded)
        const playerStatsMap = new Map(player_stats.map((p: any) => [p.player_id, p]));
        
        console.log(`MATCH COMPLETION DEBUG: Match ${matchId}, Score: ${score.team_a}-${score.team_b}, Own Goals: ${own_goals.team_a}-${own_goals.team_b}`);
        console.log(`PLAYERS WHO PLAYED: ${player_stats.length} players (no-shows excluded)`);
        
        const playerMatchesData = player_stats.map((playerStat: any) => {
            // Get team from upcoming_match_players
            const upcomingPlayer = (upcomingMatch as any).upcoming_match_players.find(p => p.player_id === playerStat.player_id);
            if (!upcomingPlayer) {
              throw new Error(`Player ${playerStat.player_id} not found in upcoming_match_players`);
            }
            
            const plannedTeam = upcomingPlayer.team;
            const actualTeam = playerStat.actual_team || plannedTeam;
            
            // Determine team score and opposing score (use actual team if swapped)
            const teamScore = actualTeam === 'A' ? score.team_a : score.team_b;
            const opposingScore = actualTeam === 'A' ? score.team_b : score.team_a;
            
            // Calculate result
            const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');
            
            // Calculate clean_sheet flag
            const clean_sheet = opposingScore === 0;
            
            const playerData = {
              match_id: newMatch.match_id,
              player_id: playerStat.player_id,
              team: plannedTeam, // Planned team (from upcoming_match_players)
              actual_team: actualTeam, // Actual team (may differ if swapped)
              goals: playerStat.goals || 0,
              result,
              clean_sheet,
              tenant_id: tenantId  // Multi-tenant: Include tenant in player match records
            };
            
            console.log(`PLAYER ${playerStat.player_id} (Team ${plannedTeam}${actualTeam !== plannedTeam ? ` → ${actualTeam}` : ''}): result=${result}, clean_sheet=${clean_sheet}, goals=${playerStat.goals}`);
            
            return playerData;
          });

        console.log(`CREATING ${playerMatchesData.length} player_matches records`);
        
        if (playerMatchesData.length > 0) {
          // Validate that all critical fields are populated
          const invalidRecords = playerMatchesData.filter(p => 
            !p.result || typeof p.clean_sheet !== 'boolean'
          );
          
          if (invalidRecords.length > 0) {
            console.error('INVALID PLAYER RECORDS DETECTED:', invalidRecords);
            throw new Error(`Invalid player match data: ${invalidRecords.length} records have NULL/invalid result fields`);
          }
          
          await tx.player_matches.createMany({
            data: playerMatchesData as any,
          });
          
          console.log(`SUCCESS: Created ${playerMatchesData.length} player_matches records with calculated fields`);
        } else {
          console.warn('WARNING: No player matches data to create - this will result in NULL fields!');
          throw new Error('No assigned players found for match completion');
        }

        // 3. Update the upcoming_match state (remove strict concurrency check for completion)
        const updatedUpcomingMatch = await tx.upcoming_matches.update({
          where: {
            upcoming_match_id: matchId,
          } as any,
          data: {
            state: 'Completed',
            state_version: { increment: 1 },
            is_completed: true,
            is_active: false,
          } as any,
        });

        return updatedUpcomingMatch;
      });

      // IMMEDIATE: Invalidate dashboard cache for instant refresh
      console.log(`INVALIDATING DASHBOARD CACHE for immediate refresh after match ${matchId}`);
      const { DASHBOARD_CACHE_TAGS } = await import('@/lib/cache/constants');
      const { revalidateTag } = await import('next/cache');
      
      // Invalidate all dashboard-related cache tags immediately
      DASHBOARD_CACHE_TAGS.forEach(tag => {
        try {
          revalidateTag(tag);
          console.log(`✅ Invalidated cache tag: ${tag}`);
        } catch (error) {
          console.warn(`⚠️ Failed to invalidate cache tag ${tag}:`, error);
        }
      });

      // Trigger stats recalculation after successful completion (non-blocking)
      console.log(`TRIGGERING STATS UPDATE for completed match ${matchId}`);
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      
      // ✅ Fire and forget - don't await this
      fetch(new URL('/api/admin/trigger-stats-update', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(statsResponse => {
        if (statsResponse.ok) {
          console.log('STATS UPDATE triggered successfully');
        } else {
          console.warn('STATS UPDATE failed to trigger');
        }
      }).catch(statsError => {
        console.warn('STATS UPDATE trigger error (non-critical):', statsError);
      });

      return NextResponse.json({ success: true, data: completedMatch });
    } catch (error: any) {
      console.error('ERROR COMPLETING MATCH:', error);
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        meta: error.meta
      });
      
      if (error.message.includes('Conflict')) {
          return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }
      if (error.message.includes('not found')) {
          return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Match completion failed: ${error.message}` 
      }, { status: 500 });
    }
  }).catch(handleTenantError);
} 