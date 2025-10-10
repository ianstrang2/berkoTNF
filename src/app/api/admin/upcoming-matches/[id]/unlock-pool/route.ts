import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring pool unlocking is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantMatchLock } from '@/lib/tenantLocks';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const matchId = parseInt(params.id, 10);
      const { state_version } = await request.json();

      if (isNaN(matchId) || typeof state_version !== 'number') {
        return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
      }

      // Multi-tenant: Use tenant-aware transaction with advisory locking
      const result = await withTenantMatchLock(tenantId, matchId, async (tx) => {
        const match = await tx.upcoming_matches.findUnique({
          where: { 
            upcoming_match_id: matchId,
            tenant_id: tenantId  // Multi-tenant: Ensure match belongs to tenant
          },
        });

        if (!match) throw new Error('Match not found');
        if ((match as any).state !== 'PoolLocked') throw new Error(`Cannot unlock pool for match with state ${(match as any).state}.`);
        if ((match as any).state_version !== state_version) throw new Error('Conflict');

        // Update the match state (tenant-scoped)
        return await tx.upcoming_matches.update({
          where: {
            upcoming_match_id: matchId,
            tenant_id: tenantId,
            state_version: state_version,
          } as any,
          data: {
            state: 'Draft',
            actual_size_a: null,     // Clear actual sizes when returning to Draft
            actual_size_b: null,     // Clear actual sizes when returning to Draft
            is_balanced: false,
            state_version: { increment: 1 },
          } as any,
        });
      });

      return NextResponse.json({ success: true, state_version: (result as any).state_version });

    } catch (error: any) {
      if (error.message === 'Conflict') {
        return NextResponse.json({ success: false, error: 'Conflict: Match has been updated by someone else.' }, { status: 409 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
  }).catch(handleTenantError);
} 