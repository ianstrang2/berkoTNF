import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch upcoming matches
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    // Build query based on parameters
    if (matchId) {
      // Get specific match with player assignments
      const match = await prisma.upcoming_matches.findUnique({
        where: { upcoming_match_id: parseInt(matchId) },
      });

      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }

      const players = await prisma.upcoming_match_players.findMany({
        where: { upcoming_match_id: parseInt(matchId) },
        include: {
          player: {
            select: {
              name: true,
              goalscoring: true,
              defender: true,
              stamina_pace: true,
              control: true,
              teamwork: true,
              resilience: true,
              is_ringer: true
            }
          }
        },
        orderBy: { slot_number: 'asc' }
      });

      return NextResponse.json({
        success: true,
        data: {
          ...match,
          players
        }
      });
    } else {
      // Get all upcoming matches
      const matches = await prisma.upcoming_matches.findMany({
        orderBy: { match_date: 'asc' },
        include: {
          players: {
            select: {
              player_id: true
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: matches.map(match => ({
          ...match,
          player_count: match.players.length
        }))
      });
    }
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming matches' }, { status: 500 });
  }
}

// POST: Create a new upcoming match
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.match_date) {
      return NextResponse.json({ error: 'Match date is required' }, { status: 400 });
    }

    // Get app settings for defaults
    const appSettings = await prisma.app_config.findMany({
      where: {
        config_key: {
          in: ['default_team_size']
        }
      }
    });
    
    const defaultTeamSize = appSettings.find(s => s.config_key === 'default_team_size')?.config_value 
      ? parseInt(appSettings.find(s => s.config_key === 'default_team_size')?.config_value || '9')
      : 9;

    // Get the default template for the selected team size
    const teamSize = body.team_size || defaultTeamSize;
    const defaultTemplate = await prisma.team_size_templates.findFirst({
      where: {
        team_size: teamSize,
        is_default: true
      }
    });

    // Create new upcoming match
    const newMatch = await prisma.upcoming_matches.create({
      data: {
        match_date: new Date(body.match_date),
        team_size: teamSize,
        team_a_name: body.team_a_name || defaultTemplate?.team_a_name || 'Orange',
        team_b_name: body.team_b_name || defaultTemplate?.team_b_name || 'Green',
        is_balanced: false
      }
    });

    return NextResponse.json({
      success: true,
      data: newMatch
    });
  } catch (error) {
    console.error('Error creating upcoming match:', error);
    return NextResponse.json({ error: 'Failed to create upcoming match' }, { status: 500 });
  }
}

// PUT: Update an existing upcoming match
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.upcoming_match_id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.match_date !== undefined) updateData.match_date = new Date(body.match_date);
    if (body.team_size !== undefined) updateData.team_size = body.team_size;
    if (body.team_a_name !== undefined) updateData.team_a_name = body.team_a_name;
    if (body.team_b_name !== undefined) updateData.team_b_name = body.team_b_name;
    if (body.is_balanced !== undefined) updateData.is_balanced = body.is_balanced;
    
    updateData.updated_at = new Date();

    // Update match
    const updatedMatch = await prisma.upcoming_matches.update({
      where: { upcoming_match_id: body.upcoming_match_id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updatedMatch
    });
  } catch (error) {
    console.error('Error updating upcoming match:', error);
    return NextResponse.json({ error: 'Failed to update upcoming match' }, { status: 500 });
  }
}

// DELETE: Delete an upcoming match
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Delete match (players will be deleted via ON DELETE CASCADE)
    await prisma.upcoming_matches.delete({
      where: { upcoming_match_id: parseInt(matchId) }
    });

    return NextResponse.json({
      success: true,
      data: { matchId: parseInt(matchId) }
    });
  } catch (error) {
    console.error('Error deleting upcoming match:', error);
    return NextResponse.json({ error: 'Failed to delete upcoming match' }, { status: 500 });
  }
} 