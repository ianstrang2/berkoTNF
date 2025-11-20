import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring balance algorithm reset is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

// POST handler - reset balance algorithm weights to defaults
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
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
  }).catch(handleTenantError);
} 