import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring team template reset is tenant-scoped
import { getTenantFromRequest } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    // Multi-tenant setup - ensure team template reset is tenant-scoped
    const tenantId = await getTenantFromRequest(request);
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
    
    // Get templateId from the query parameters
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    // Find the template to get its team_size
    const template = await prisma.team_size_templates.findUnique({
      where: { 
        template_id: parseInt(templateId),
        tenant_id: tenantId
      }
    });
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    // Get the team size from the template
    const { team_size } = template;
    
    // Fetch default values for this team size from the defaults table
    const defaultTemplate = await prisma.team_size_templates_defaults.findFirst({
      where: {
        team_size: team_size
      }
    });
    
    if (!defaultTemplate) {
      return NextResponse.json({ error: `No default template found for ${team_size}-a-side` }, { status: 404 });
    }
    
    // Update the template with the default values
    const updatedTemplate = await prisma.team_size_templates.update({
      where: {
        template_id: parseInt(templateId),
        tenant_id: tenantId
      },
      data: {
        defenders: defaultTemplate.defenders_per_team,
        midfielders: defaultTemplate.midfielders_per_team,
        attackers: defaultTemplate.attackers_per_team,
        updated_at: new Date()
      }
    });
    
    return NextResponse.json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 