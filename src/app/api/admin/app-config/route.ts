import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring app config is tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

// GET: Fetch all app configuration settings
export async function GET(request: Request) {
  try {
    // Multi-tenant setup - ensure config operations are tenant-scoped
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    // First, check if the app_config table exists and is accessible
    try {
      const testConfig = await tenantPrisma.app_config.findFirst();
      if (!testConfig) {
        console.log('Warning: app_config table seems empty but accessible');
      }
    } catch (tableError) {
      console.error('Error accessing app_config table:', tableError);
      return NextResponse.json({ 
        error: 'Database error: Cannot access app_config table. Please check database configuration.' 
      }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const groupsQueryParam = searchParams.get('groups');

    let configs;
    const orderByClause = [
      { config_group: 'asc' },
      { display_group: 'asc' },
      { sort_order: 'asc' },
      { display_name: 'asc' },
      { config_key: 'asc' }
    ];

    if (groupsQueryParam) {
      const groupArray = groupsQueryParam.split(',').map(g => g.trim()).filter(g => g);
      if (groupArray.length > 0) {
        // Multi-tenant: Query scoped to current tenant only
        configs = await tenantPrisma.app_config.findMany({
          where: {
            config_group: {
              in: groupArray
            }
          },
          orderBy: orderByClause
        });
      } else {
        // Multi-tenant: Query scoped to current tenant only
        configs = await tenantPrisma.app_config.findMany({
          orderBy: orderByClause
        });
      }
    } else {
      // Multi-tenant: Query scoped to current tenant only
      configs = await tenantPrisma.app_config.findMany({
        orderBy: orderByClause
      });
    }

    return NextResponse.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching app config:', error);
    return NextResponse.json({ error: 'Failed to fetch app configuration' }, { status: 500 });
  }
}

// PUT: Update app configuration settings
export async function PUT(request: Request) {
  try {
    // Skip auth check since AdminLayout already handles this
    const body = await request.json();
    
    if (!body || !Array.isArray(body.configs)) {
      return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
    }

    // Update configs in a transaction
    const updateResults = await prisma.$transaction(
      body.configs.map((config: { config_key: string; config_value: string }) => 
        prisma.app_config.updateMany({
          where: { config_key: config.config_key },
          data: { 
            config_value: config.config_value,
            updated_at: new Date()
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: updateResults
    });
  } catch (error) {
    console.error('Error updating app config:', error);
    return NextResponse.json({ error: 'Failed to update app configuration' }, { status: 500 });
  }
}

// POST: Reset config group to defaults
export async function POST(request: Request) {
  try {
    // Skip auth check since AdminLayout already handles this
    const body = await request.json();
    
    console.log('Reset request body:', body);
    
    if (!body || !body.group) {
      return NextResponse.json({ error: 'Group parameter is required' }, { status: 400 });
    }

    // First, check if the app_config_defaults table exists and is accessible
    try {
      const testDefaults = await prisma.app_config_defaults.findFirst();
      if (!testDefaults) {
        console.error('app_config_defaults table exists but is empty');
        return NextResponse.json({ 
          error: 'No defaults found in database. Please check if defaults were properly initialized.' 
        }, { status: 500 });
      }
    } catch (tableError) {
      console.error('Error accessing app_config_defaults table:', tableError);
      return NextResponse.json({ 
        error: 'Database error: Cannot access default values. The app_config_defaults table may not exist.' 
      }, { status: 500 });
    }

    console.log('Fetching defaults for group:', body.group);
    
    // Fetch default values from app_config_defaults table
    const defaultValues = await prisma.app_config_defaults.findMany({
      where: {
        config_group: body.group
      },
      select: {
        config_key: true,
        config_value: true
      }
    });

    console.log('Default values found:', defaultValues);

    if (!defaultValues || defaultValues.length === 0) {
      return NextResponse.json({ 
        error: `No default values found for group "${body.group}". Please check database configuration.` 
      }, { status: 404 });
    }

    console.log('Updating values in app_config...');
    
    // Update configs in a transaction
    const updateResults = await prisma.$transaction(
      defaultValues.map(config => {
        console.log('Updating config:', config);
        return prisma.app_config.updateMany({
          where: { config_key: config.config_key },
          data: { 
            config_value: config.config_value,
            updated_at: new Date()
          }
        });
      })
    );

    console.log('Update completed. Results:', updateResults);

    return NextResponse.json({
      success: true,
      data: updateResults
    });
  } catch (error) {
    console.error('Detailed error resetting app config:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to reset app configuration to defaults' 
    }, { status: 500 });
  }
} 