import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring performance settings are tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// GET - Fetch current performance algorithm settings
export async function GET(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure performance settings are tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const configs = await prisma.app_config.findMany({
      where: {
        tenant_id: tenantId,
        config_key: {
          in: ['performance_half_life_days', 'performance_qualification_threshold']
        }
      }
    });

    // Convert to expected format (no hardcoded defaults - values should exist in DB)
    const result = {
      half_life_days: 730, // fallback only if DB is missing data
      qualification_threshold: 5 // fallback only if DB is missing data
    };

    configs.forEach(config => {
      if (config.config_key === 'performance_half_life_days') {
        result.half_life_days = parseInt(config.config_value);
      } else if (config.config_key === 'performance_qualification_threshold') {
        result.qualification_threshold = parseInt(config.config_value);
      }
    });

    // Warn if we're missing configs (should not happen after setup)
    if (configs.length !== 2) {
      console.warn('Missing performance setting configs in database. Expected 2, found:', configs.length);
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    return handleTenantError(error);
  }
}

// PUT - Update performance algorithm settings
export async function PUT(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure performance settings updates are tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    const body = await request.json();
    const { half_life_days, qualification_threshold } = body;

    // Validate settings
    if (typeof half_life_days !== 'number' || typeof qualification_threshold !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid setting values' },
        { status: 400 }
      );
    }

    if (half_life_days < 30 || half_life_days > 2000) {
      return NextResponse.json(
        { success: false, error: 'Half-life days must be between 30 and 2000' },
        { status: 400 }
      );
    }

    if (qualification_threshold < 1 || qualification_threshold > 50) {
      return NextResponse.json(
        { success: false, error: 'Qualification threshold must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Update or create half_life_days config
    await prisma.app_config.upsert({
      where: {
        config_key: 'performance_half_life_days'
      },
      update: {
        config_value: half_life_days.toString(),
        updated_at: new Date()
      },
      create: {
        tenant_id: tenantId,
        config_key: 'performance_half_life_days',
        config_value: half_life_days.toString(),
        config_description: 'EWMA half-life in days (365=1yr, 730=2yr, 1095=3yr)',
        config_group: 'performance',
        display_name: 'Performance Half-Life Days',
        display_group: 'Performance'
      }
    } as any);

    // Update or create qualification_threshold config
    await prisma.app_config.upsert({
      where: {
        config_key: 'performance_qualification_threshold'
      },
      update: {
        config_value: qualification_threshold.toString(),
        updated_at: new Date()
      },
      create: {
        tenant_id: tenantId,
        config_key: 'performance_qualification_threshold',
        config_value: qualification_threshold.toString(),
        config_description: 'Minimum weighted games for percentile display',
        config_group: 'performance',
        display_name: 'Performance Qualification Threshold',
        display_group: 'Performance'
      }
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Performance settings updated successfully'
    });

  } catch (error) {
    return handleTenantError(error);
  }
}

// DELETE - Reset to defaults
export async function DELETE(request: NextRequest) {
  try {
    // Multi-tenant setup - ensure reset is tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Delete custom configs to fall back to defaults
    await prisma.app_config.deleteMany({
      where: {
        tenant_id: tenantId,
        config_key: {
          in: ['performance_half_life_days', 'performance_qualification_threshold']
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Performance settings reset to defaults'
    });

  } catch (error) {
    return handleTenantError(error);
  }
} 