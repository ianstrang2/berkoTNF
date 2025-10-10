/**
 * Admin Join Requests API
 * 
 * GET /api/admin/join-requests - List pending join requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { withTenantFilter } from '@/lib/tenantFilter';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // Verify admin access
      await requireAdminRole(request);
      
      const requests = await prisma.player_join_requests.findMany({
        where: withTenantFilter(tenantId, {
          status: 'pending',
        }),
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        phone_number: true,
        display_name: true,
        created_at: true,
      },
    });

      return NextResponse.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

