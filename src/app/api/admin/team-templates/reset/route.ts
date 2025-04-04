import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Get templateId from the query parameters
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }
    
    // Find the template to get its team_size
    const template = await prisma.team_size_templates.findUnique({
      where: { 
        template_id: parseInt(templateId) 
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
        template_id: parseInt(templateId) 
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
    console.error('Error resetting team template:', error);
    return NextResponse.json({ error: 'Failed to reset team template' }, { status: 500 });
  }
} 