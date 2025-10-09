import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring app config is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// GET: Fetch all app configuration settings
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const startTime = Date.now();
    
    // Get query parameters - support both 'group' and 'groups' for backward compatibility
    const { searchParams } = new URL(request.url);
    const groupsQueryParam = searchParams.get('groups') || searchParams.get('group');

    let configs;
    const orderByClause = [
      { config_group: 'asc' },
      { display_group: 'asc' },
      { sort_order: 'asc' },
      { display_name: 'asc' },
      { config_key: 'asc' }
    ];

    try {
      if (groupsQueryParam) {
        const groupArray = groupsQueryParam.split(',').map(g => g.trim()).filter(g => g);
        if (groupArray.length > 0) {
          // Multi-tenant: Query scoped to current tenant only
          console.log(`🔍 [APP-CONFIG] Querying groups:`, groupArray);
          const queryStart = Date.now();
          configs = await prisma.app_config.findMany({
            where: {
              tenant_id: tenantId,
              config_group: {
                in: groupArray
              }
            },
            orderBy: orderByClause
          });
          console.log(`⏱️ [APP-CONFIG] Query took ${Date.now() - queryStart}ms (${configs.length} rows)`);
        } else {
          // Multi-tenant: Query scoped to current tenant only
          configs = await prisma.app_config.findMany({
            where: { tenant_id: tenantId },
            orderBy: orderByClause
          });
        }
      } else {
        // Multi-tenant: Query scoped to current tenant only
        console.log(`🔍 [APP-CONFIG] Fetching all configs (no group filter)`);
        const queryStart = Date.now();
        configs = await prisma.app_config.findMany({
          where: { tenant_id: tenantId },
          orderBy: orderByClause
        });
        console.log(`⏱️ [APP-CONFIG] Query took ${Date.now() - queryStart}ms (${configs.length} rows)`);
      }
    } catch (error) {
      console.error('Error fetching app_config:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch configuration',
        success: false
      }, { status: 500 });
    }

    console.log(`⏱️ [APP-CONFIG] ✅ TOTAL TIME: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      data: configs
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Private cache, 5 min per tenant
        'Vary': 'Cookie', // Cache varies by session cookie
      }
    });
  }).catch(handleTenantError);
}

// PUT: Update app configuration settings
export async function PUT(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();

    if (!body.configs || !Array.isArray(body.configs)) {
      return NextResponse.json({ 
        error: 'configs array is required' 
      }, { status: 400 });
    }

    // Update configs in a transaction
    const updateResults = await prisma.$transaction(
      body.configs.map((config: { config_key: string; config_value: string }) => 
        prisma.app_config.updateMany({
          where: { config_key: config.config_key, tenant_id: tenantId },
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
  }).catch(handleTenantError);
}

// POST: Reset configuration group to defaults
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();

    if (!body.group) {
      return NextResponse.json({ 
        error: 'group is required' 
      }, { status: 400 });
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
          where: { 
            config_key: config.config_key,
            tenant_id: tenantId  // ✅ SECURITY: Ensure updates only affect current tenant
          },
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
  }).catch(handleTenantError);
} 