import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring balance algorithm is tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

// GET handler - retrieve balance algorithm weights
export async function GET() {
  try {
    // Multi-tenant setup - ensure balance algorithm is tenant-scoped
    const tenantId = getCurrentTenantId();
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
    console.error('Error fetching balance algorithm weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balance algorithm weights' },
      { status: 500 }
    );
  }
}

// PUT handler - update balance algorithm weights
export async function PUT(request: Request) {
  try {
    // Multi-tenant setup - ensure balance algorithm updates are tenant-scoped
    const tenantId = getCurrentTenantId();
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
    console.error('Error updating balance algorithm weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update balance algorithm weights' },
      { status: 500 }
    );
  }
} 