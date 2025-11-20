import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { requireAdminRole } from '@/lib/auth/apiAuth';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // SECURITY: Verify admin access
      await requireAdminRole(request);
      // Update all slots to have null player_id - MULTI-TENANT: Scoped to tenant
      await prisma.team_slots.updateMany({
        where: { tenant_id: tenantId },
        data: {
          player_id: null,
          updated_at: new Date()
        }
      });

      // Fetch the cleared slots to return - MULTI-TENANT: Scoped to tenant
      const clearedSlots = await prisma.team_slots.findMany({
        where: { tenant_id: tenantId },
        orderBy: {
          slot_number: 'asc'
        }
      });

      return NextResponse.json({ 
        success: true,
        data: clearedSlots
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
} 