import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring balance algorithm is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// GET handler - retrieve balance algorithm weights
export async function GET(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure balance algorithm is tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Fetch balance weights from database
    const weights = await prisma.team_balance_weights.findMany({
      where: { tenant_id: tenantId },
      orderBy: {
        position_group: 'asc'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: weights.map(w => ({
        attribute_id: w.weight_id,
        name: w.attribute,
        description: w.position_group,
        weight: Number(w.weight)
      }))
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

// PUT handler - update balance algorithm weights
export async function PUT(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure balance algorithm updates are tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const body = await request.json();
    const { weights } = body;
    
    if (!weights || !Array.isArray(weights)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    // For each weight, update in database
    for (const weight of weights) {
      await prisma.team_balance_weights.update({
        where: { weight_id: weight.attribute_id, tenant_id: tenantId },
        data: { weight: weight.weight }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleTenantError(error);
  }
} 