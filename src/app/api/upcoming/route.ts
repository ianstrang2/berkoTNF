import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toPlayerInPool } from '@/lib/transform/player.transform';
// Multi-tenant imports - gradually introducing tenant-aware functionality
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

// GET: Fetch upcoming matches for public view
export async function GET(request: NextRequest) {
  try {
    // Multi-tenant setup - get current tenant context
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');

    if (matchId) {
      // Get specific match with full details for expansion
      // Multi-tenant: Using tenant-scoped query for data isolation
      const match = await tenantPrisma.upcoming_matches.findUnique({
        where: { upcoming_match_id: parseInt(matchId) },
        include: {
          upcoming_match_players: {
            include: {
              players: true
            },
            orderBy: [
              { slot_number: 'asc' },
              { created_at: 'asc' }
            ]
          }
        }
      });

      if (!match) {
        return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
      }

      // Format the response
      const { upcoming_match_players, ...matchData } = match as any;
      const formattedMatch = {
        ...matchData,
        players: upcoming_match_players.map(p => toPlayerInPool(p))
      };

      return NextResponse.json({ success: true, data: formattedMatch }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    } else {
      // Fetch upcoming matches (non-completed, >= today's date)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      // Multi-tenant: Using tenant-scoped query for data isolation
      const matches = await tenantPrisma.upcoming_matches.findMany({
        where: {
          state: {
            not: 'Completed'
          },
          match_date: {
            gte: today
          }
        },
        orderBy: {
          match_date: 'asc'
        },
        include: {
          _count: {
            select: { players: true }
          }
        }
      });

      return NextResponse.json({ success: true, data: matches }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
  } catch (error: any) {
    console.error('Error fetching upcoming matches:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
