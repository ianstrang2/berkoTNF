import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring balance algorithm reset is tenant-scoped
import { getCurrentTenantId } from '@/lib/tenantContext';

// POST handler - reset balance algorithm weights to defaults
export async function POST() {
  try {
    // Multi-tenant setup - ensure balance algorithm reset is tenant-scoped
    const tenantId = getCurrentTenantId();
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Get the default values from team_balance_weights_defaults table
    const defaultWeights = await prisma.team_balance_weights_defaults.findMany();
    
    // Reset all weights from team_balance_weights table
    // First, get all current weights
    const currentWeights = await prisma.team_balance_weights.findMany({
      where: { tenant_id: tenantId }
    });
    
    // Update each weight to match the default value
    for (const current of currentWeights) {
      // Find the matching default weight
      const defaultWeight = defaultWeights.find(
        def => def.position_group === current.position_group && def.attribute === current.attribute
      );
      
      if (defaultWeight) {
        await prisma.team_balance_weights.update({
          where: { weight_id: current.weight_id, tenant_id: tenantId },
          data: { weight: defaultWeight.weight }
        });
      }
    }
    
    // Fetch the updated weights
    const updatedWeights = await prisma.team_balance_weights.findMany({
      where: { tenant_id: tenantId },
      orderBy: {
        position_group: 'asc'
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Balance algorithm weights reset to defaults',
      data: updatedWeights.map(w => ({
        attribute_id: w.weight_id,
        name: w.attribute,
        description: w.position_group,
        weight: Number(w.weight)
      }))
    });
  } catch (error) {
    console.error('Error resetting balance algorithm weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset balance algorithm weights' },
      { status: 500 }
    );
  }
} 