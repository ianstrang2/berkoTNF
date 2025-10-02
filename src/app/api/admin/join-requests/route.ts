/**
 * Admin Join Requests API
 * 
 * GET /api/admin/join-requests - List pending join requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireAdminRole(request);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }
    
    const requests = await prisma.player_join_requests.findMany({
      where: {
        tenant_id: tenantId,
        status: 'pending',
      },
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
  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

