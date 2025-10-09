import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring team template operations are tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

// GET: Fetch team size templates
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const teamSize = searchParams.get('teamSize');

    // Build query based on parameters
    let templates;
    if (templateId) {
      // Get specific template
      const template = await prisma.team_size_templates.findUnique({
        where: { 
          template_id: parseInt(templateId),
          tenant_id: tenantId
        }
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: template
      });
    } else if (teamSize) {
      // Get templates for specific team size
      templates = await prisma.team_size_templates.findMany({
        where: { 
          team_size: parseInt(teamSize),
          tenant_id: tenantId
        },
        orderBy: { 
          created_at: 'asc' 
        }
      });
      
      // If no custom templates found, fall back to defaults
      if (templates.length === 0) {
        const defaultTemplate = await prisma.team_size_templates_defaults.findUnique({
          where: { team_size: parseInt(teamSize) }
        });
        
        if (defaultTemplate) {
          templates = [{
            template_id: 0, // Indicate this is a default
            team_size: defaultTemplate.team_size,
            name: defaultTemplate.name || `${defaultTemplate.team_size}-a-side`,
            defenders: defaultTemplate.defenders_per_team,
            midfielders: defaultTemplate.midfielders_per_team,
            attackers: defaultTemplate.attackers_per_team,
            created_at: null,
            updated_at: null
          }];
        }
      }
    } else {
      // Get all templates
      templates = await prisma.team_size_templates.findMany({
        where: { tenant_id: tenantId },
        orderBy: [
          { team_size: 'asc' },
          { name: 'asc' }
        ]
      });
      
      // If no custom templates exist, fall back to all defaults
      if (templates.length === 0) {
        const defaultTemplates = await prisma.team_size_templates_defaults.findMany({
          orderBy: { team_size: 'asc' }
        });
        
        templates = defaultTemplates.map(defaultTemplate => ({
          template_id: 0, // Indicate this is a default
          team_size: defaultTemplate.team_size,
          name: defaultTemplate.name || `${defaultTemplate.team_size}-a-side`,
          defenders: defaultTemplate.defenders_per_team,
          midfielders: defaultTemplate.midfielders_per_team,
          attackers: defaultTemplate.attackers_per_team,
          created_at: null,
          updated_at: null
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: templates
    });
  }).catch(handleTenantError);
}

// POST: Create a new team template
export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();
    
    // Validate required fields
    if (!body.team_size || !body.name || !body.defenders || 
        !body.midfielders || !body.attackers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate total players matches team size
    const totalPlayers = body.defenders + body.midfielders + body.attackers;
    if (totalPlayers !== body.team_size) {
      return NextResponse.json({ 
        error: `Total players (${totalPlayers}) does not match team size (${body.team_size})` 
      }, { status: 400 });
    }

    // Create new template
    const newTemplate = await prisma.team_size_templates.create({
      data: {
        tenant_id: tenantId,
        team_size: body.team_size,
        name: body.name,
        defenders: body.defenders,
        midfielders: body.midfielders,
        attackers: body.attackers
      }
    });

    return NextResponse.json({
      success: true,
      data: newTemplate
    });
  }).catch(handleTenantError);
}

// PUT: Update an existing team template
export async function PUT(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const body = await request.json();
    
    // Validate required fields
    if (!body.template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // If changing player distribution, validate total
    if (body.defenders !== undefined && 
        body.midfielders !== undefined && 
        body.attackers !== undefined) {
      
      const template = await prisma.team_size_templates.findUnique({
        where: { template_id: body.template_id, tenant_id: tenantId }
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const totalPlayers = body.defenders + body.midfielders + body.attackers;
      if (totalPlayers !== template.team_size) {
        return NextResponse.json({ 
          error: `Total players (${totalPlayers}) does not match team size (${template.team_size})` 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.defenders !== undefined) updateData.defenders = body.defenders;
    if (body.midfielders !== undefined) updateData.midfielders = body.midfielders;
    if (body.attackers !== undefined) updateData.attackers = body.attackers;
    
    updateData.updated_at = new Date();

    // Update template
    const updatedTemplate = await prisma.team_size_templates.update({
      where: { template_id: body.template_id, tenant_id: tenantId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate
    });
  }).catch(handleTenantError);
}

// DELETE: Delete a team template
export async function DELETE(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if template exists
    const template = await prisma.team_size_templates.findUnique({
      where: { template_id: parseInt(templateId), tenant_id: tenantId }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete template
    await prisma.team_size_templates.delete({
      where: { template_id: parseInt(templateId), tenant_id: tenantId }
    });

    return NextResponse.json({
      success: true,
      data: { templateId: parseInt(templateId) }
    });
  }).catch(handleTenantError);
} 