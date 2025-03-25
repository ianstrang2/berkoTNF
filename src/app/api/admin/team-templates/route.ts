import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch team size templates
export async function GET(request: Request) {
  try {
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
          template_id: parseInt(templateId) 
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
          team_size: parseInt(teamSize) 
        },
        orderBy: { 
          created_at: 'asc' 
        }
      });
    } else {
      // Get all templates
      templates = await prisma.team_size_templates.findMany({
        orderBy: [
          { team_size: 'asc' },
          { name: 'asc' }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching team templates:', error);
    return NextResponse.json({ error: 'Failed to fetch team templates' }, { status: 500 });
  }
}

// POST: Create a new team template
export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error('Error creating team template:', error);
    return NextResponse.json({ error: 'Failed to create team template' }, { status: 500 });
  }
}

// PUT: Update an existing team template
export async function PUT(request: Request) {
  try {
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
        where: { template_id: body.template_id }
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
      where: { template_id: body.template_id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating team template:', error);
    return NextResponse.json({ error: 'Failed to update team template' }, { status: 500 });
  }
}

// DELETE: Delete a team template
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if template exists
    const template = await prisma.team_size_templates.findUnique({
      where: { template_id: parseInt(templateId) }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete template
    await prisma.team_size_templates.delete({
      where: { template_id: parseInt(templateId) }
    });

    return NextResponse.json({
      success: true,
      data: { templateId: parseInt(templateId) }
    });
  } catch (error) {
    console.error('Error deleting team template:', error);
    return NextResponse.json({ error: 'Failed to delete team template' }, { status: 500 });
  }
} 