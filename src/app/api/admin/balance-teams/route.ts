import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { balanceByRating } from './balanceByRating';
import { balanceByPerformance } from './balanceByPerformance';
import { splitSizesFromPool } from '@/utils/teamSplit.util';
// Multi-tenant imports - ensuring team balancing is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure team balancing is tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const body = await request.json();
    const { matchId, playerIds, method, state_version } = body;

    if (!matchId || !playerIds || !method) {
      return NextResponse.json({ success: false, error: 'matchId, playerIds, and method are required' }, { status: 400 });
    }

    // Get match info including actual team sizes
    // Multi-tenant: Query scoped to current tenant only
    const match = await prisma.upcoming_matches.findUnique({
      where: { upcoming_match_id: parseInt(matchId), tenant_id: tenantId },
      select: { 
        actual_size_a: true, 
        actual_size_b: true, 
        team_size: true,
        state: true 
      }
    });
    
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    
    // Use actual sizes as source of truth if available, otherwise calculate
    let sizeA, sizeB;
    if (match.actual_size_a && match.actual_size_b) {
      sizeA = match.actual_size_a;
      sizeB = match.actual_size_b;
    } else {
      const sizes = splitSizesFromPool(playerIds.length);
      sizeA = sizes.a;
      sizeB = sizes.b;
    }
    
    const isUneven = sizeA !== sizeB;
    const isSimplified = (sizeA + sizeB) === 8;
    
    // Block Ability balancing for ANY uneven team (4v4 or larger splits like 4v5, 5v6)
    if (method === 'balanceByRating' && (isUneven || isSimplified)) {
      return NextResponse.json({
        success: false,
        error: 'Ability balancing not supported for uneven teams. Use Performance or Random.',
      }, { status: 400 });
    }

    // Ensure playerIds are strings for consistent processing in helpers
    const playerIdsAsStrings = playerIds.map((id: any) => String(id));

    let result;
    if (method === 'balanceByRating') {
      // Multi-tenant: Pass tenant context to balance function
      result = await balanceByRating(matchId, { a: sizeA, b: sizeB }, state_version, tenantId);
    } else if (method === 'balanceByPerformance') {
      // Multi-tenant: Pass tenant context to balance function
      result = await balanceByPerformance(matchId, playerIdsAsStrings, { a: sizeA, b: sizeB }, tenantId, state_version);
    } else if (method === 'random') {
      // Call the existing random balance endpoint directly
      const baseUrl = new URL(request.url).origin;
      const randomUrl = `${baseUrl}/api/admin/random-balance-match?matchId=${matchId}`;
      
      console.log('Calling random balance URL:', randomUrl);
      
      const randomResponse = await fetch(randomUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const randomData = await randomResponse.json();
      
      console.log('Random balance response:', randomData);
      
      if (!randomData.success) {
        return NextResponse.json({ success: false, error: randomData.error }, { status: randomResponse.status });
      }
      
      result = randomData.data;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid balancing method' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    return handleTenantError(error);
  }
} 