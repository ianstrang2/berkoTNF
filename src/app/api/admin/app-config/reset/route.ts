import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

/**
 * POST: Reset configuration group to defaults
 * Returns the new config values after reset
 */
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    
    const body = await request.json();

    if (!body.group) {
      return NextResponse.json({ 
        error: 'group is required',
        success: false
      }, { status: 400 });
    }

    const group = body.group;
    console.log(`[APP-CONFIG-RESET] Resetting group "${group}" for tenant ${tenantId}`);

    // Fetch default values from app_config_defaults table
    const defaultValues = await prisma.app_config_defaults.findMany({
      where: {
        config_group: group
      },
      select: {
        config_key: true,
        config_value: true
      }
    });

    if (!defaultValues || defaultValues.length === 0) {
      return NextResponse.json({ 
        error: `No default values found for group "${group}". Please check database configuration.`,
        success: false
      }, { status: 404 });
    }

    console.log(`[APP-CONFIG-RESET] Found ${defaultValues.length} defaults for group "${group}"`);

    // Update configs in a transaction
    await prisma.$transaction(
      defaultValues.map(config => 
        prisma.app_config.updateMany({
          where: { 
            config_key: config.config_key,
            tenant_id: tenantId
          },
          data: { 
            config_value: config.config_value,
            updated_at: new Date()
          }
        })
      )
    );

    // Fetch the updated configs to return to the client
    const updatedConfigs = await prisma.app_config.findMany({
      where: {
        tenant_id: tenantId,
        config_group: group
      },
      select: {
        config_key: true,
        config_value: true
      }
    });

    console.log(`[APP-CONFIG-RESET] Successfully reset ${updatedConfigs.length} configs for group "${group}"`);

    return NextResponse.json({
      success: true,
      data: updatedConfigs
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie',
      }
    });
  }).catch(handleTenantError);
}

