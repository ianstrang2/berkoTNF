/**
 * Reject Join Request API
 * 
 * POST /api/admin/join-requests/reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const { user, tenantId } = await requireAdminRole(request);
    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId' },
        { status: 400 }
      );
    }

    // Get the join request
    const joinRequest = await prisma.player_join_requests.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest || joinRequest.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Join request not found' },
        { status: 404 }
      );
    }

    // Mark as rejected
    await prisma.player_join_requests.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        approved_by: user.id,
        processed_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Join request rejected',
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

