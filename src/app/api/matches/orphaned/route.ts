import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring orphaned matches are tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

export interface OrphanedMatch {
  match_id: number;
  match_date: string;
  team_a_score: number;
  team_b_score: number;
}

// GET /api/matches/orphaned - Find matches not covered by any season
export async function GET() {
  try {
    // Multi-tenant: Get tenant context for scoped queries
    const tenantId = getCurrentTenantId();
    
    const orphanedMatches = await prisma.$queryRaw`
      SELECT 
        m.match_id,
        m.match_date,
        m.team_a_score,
        m.team_b_score
      FROM matches m
      WHERE m.tenant_id = ${tenantId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM seasons s 
          WHERE m.match_date BETWEEN s.start_date AND s.end_date
            AND s.tenant_id = ${tenantId}::uuid
        )
      ORDER BY m.match_date DESC
    ` as Array<{
      match_id: number;
      match_date: Date;
      team_a_score: number;
      team_b_score: number;
    }>;

    return NextResponse.json({
      success: true,
      data: orphanedMatches.map(match => ({
        match_id: match.match_id,
        match_date: match.match_date.toISOString().split('T')[0],
        team_a_score: match.team_a_score,
        team_b_score: match.team_b_score
      }))
    });
  } catch (error) {
    console.error('Error fetching orphaned matches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orphaned matches' },
      { status: 500 }
    );
  }
}
