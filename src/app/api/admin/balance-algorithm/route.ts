import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch balance algorithm weights
export async function GET(request: Request) {
  try {
    // Check if team_balance_weights table exists and has data
    let weightsTableExists = true;
    try {
      // Try to fetch a single row to see if table exists
      await prisma.$queryRaw`SELECT weight_id FROM team_balance_weights LIMIT 1`;
    } catch (error) {
      console.warn('team_balance_weights table may not exist:', error);
      weightsTableExists = false;
      return NextResponse.json({ 
        error: 'Balance weights table not accessible. Please check database structure.' 
      }, { status: 500 });
    }
    
    // Get the balance weights - no longer filtered by template_id
    const weights = await prisma.team_balance_weights.findMany({
      orderBy: [
        { position_group: 'asc' },
        { attribute: 'asc' }
      ]
    });
    
    if (weights.length === 0) {
      console.warn('No weights found in the database');
      return NextResponse.json({ 
        error: 'No balance weights found. Please initialize weights.' 
      }, { status: 404 });
    }

    // Enhance weight data with descriptive names
    const enhancedWeights = weights.map((weight: any) => {
      // Convert decimal weight to number in range 0-100 for UI
      const numericWeight = parseFloat(weight.weight.toString()) * 100;
      
      // Descriptive names for attributes
      const attributeNames: Record<string, string> = {
        'stamina_pace': 'Stamina & Pace',
        'control': 'Ball Control',
        'goalscoring': 'Finishing',
        'resilience': 'Resilience',
        'teamwork': 'Teamwork'
      };
      
      // Descriptions for each attribute
      const attributeDescriptions: Record<string, string> = {
        'stamina_pace': 'Player\'s endurance and speed',
        'control': 'Ability to control and pass the ball',
        'goalscoring': 'Ability to score goals',
        'resilience': 'Mental toughness in difficult situations',
        'teamwork': 'Cooperation with teammates'
      };
      
      // Position group display names
      const positionGroupNames: Record<string, string> = {
        'defense': 'Defenders',
        'midfield': 'Midfielders',
        'attack': 'Attackers',
        'team': 'Team-wide'
      };

      return {
        ...weight,
        weight: numericWeight,
        name: attributeNames[weight.attribute] || weight.attribute,
        description: attributeDescriptions[weight.attribute] || '',
        position_group_name: positionGroupNames[weight.position_group] || weight.position_group
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedWeights
    });
  } catch (error) {
    console.error('Error fetching balance algorithm weights:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch balance algorithm weights' 
    }, { status: 500 });
  }
}

// PUT: Update balance algorithm weights
export async function PUT(request: Request) {
  try {
    // Check if team_balance_weights table exists
    try {
      await prisma.$queryRaw`SELECT weight_id FROM team_balance_weights LIMIT 1`;
    } catch (error) {
      console.warn('team_balance_weights table may not exist:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Balance weights table not accessible. Please check database structure.' 
      }, { status: 500 });
    }
    
    const body = await request.json();
    
    // Check if we have weights array
    if (body.weights && Array.isArray(body.weights)) {
      // Update each weight individually
      const updatePromises = body.weights.map((weight: any) => {
        // Convert from UI range (0-100) to DB range (0-1)
        const dbWeight = parseFloat(weight.weight) / 100;
        
        return prisma.team_balance_weights.update({
          where: {
            weight_id: weight.weight_id
          },
          data: { 
            weight: dbWeight,
            updated_at: new Date()
          }
        });
      });
      
      await Promise.all(updatePromises);
      
      // Get the updated weights
      const updatedWeights = await prisma.team_balance_weights.findMany({
        orderBy: [
          { position_group: 'asc' },
          { attribute: 'asc' }
        ]
      });
      
      // Enhance weight data for response
      const enhancedWeights = updatedWeights.map((weight: any) => {
        const numericWeight = parseFloat(weight.weight.toString()) * 100;
        return {
          ...weight,
          weight: numericWeight
        };
      });
      
      return NextResponse.json({
        success: true,
        data: enhancedWeights
      });
    } 
    else {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request format' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating balance weights:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update balance weights' 
    }, { status: 500 });
  }
}

// Helper function for team balancing algorithm
function balanceTeams(
  playersByPosition: {
    defenders: any[],
    midfielders: any[],
    attackers: any[]
  },
  playersPerTeam: {
    defenders: number,
    midfielders: number,
    attackers: number
  },
  weightMap: {[key: string]: {[key: string]: number}}
) {
  // Initialize teams
  const teamA: any[] = [];
  const teamB: any[] = [];
  
  // Helper function to calculate player score based on position and attributes
  const calculatePlayerScore = (player: any, position: string) => {
    let score = 0;
    const posKey = position === 'defender' ? 'defense' : 
                   position === 'midfielder' ? 'midfield' : 'attack';
    
    // Calculate position-specific weighted score
    if (weightMap[posKey]) {
      for (const [attribute, weight] of Object.entries(weightMap[posKey])) {
        if (player[attribute] !== undefined) {
          score += player[attribute] * weight;
        }
      }
    }
    
    // Add team-wide attributes if available
    if (weightMap['team']) {
      for (const [attribute, weight] of Object.entries(weightMap['team'])) {
        if (player[attribute] !== undefined) {
          score += player[attribute] * weight;
        }
      }
    }
    
    return score;
  };
  
  // Sort players by score for each position
  for (const position of ['defenders', 'midfielders', 'attackers']) {
    const positionKey = position.slice(0, -1) as 'defender' | 'midfielder' | 'attacker';
    const players = [...playersByPosition[position]].sort((a, b) => {
      return calculatePlayerScore(b, positionKey) - calculatePlayerScore(a, positionKey);
    });
    
    // Distribute players by ranking (snake draft)
    const count = playersPerTeam[position];
    for (let i = 0; i < count * 2; i++) {
      if (i % 2 === 0) {
        teamA.push({...players[i], team: 'A'});
      } else {
        teamB.push({...players[i], team: 'B'});
      }
    }
  }
  
  return { teamA, teamB };
}

// POST: Reset balance weights to defaults
export async function POST(request: Request) {
  try {
    // Check if balance weights defaults table exists
    let defaultsTableExists = true;
    try {
      await prisma.$queryRaw`SELECT position_group FROM team_balance_weights_defaults LIMIT 1`;
    } catch (error) {
      console.warn('team_balance_weights_defaults table may not exist:', error);
      defaultsTableExists = false;
      return NextResponse.json({ 
        success: false,
        error: 'Balance weights defaults table not accessible. Please check database structure.' 
      }, { status: 500 });
    }
    
    const body = await request.json();
    
    if (!body || body.action !== 'reset') {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request. Action must be "reset".' 
      }, { status: 400 });
    }
    
    // Fetch default weights from team_balance_weights_defaults table
    const defaultWeights = await prisma.team_balance_weights_defaults.findMany({
      orderBy: [
        { position_group: 'asc' },
        { attribute: 'asc' }
      ]
    });
    
    if (!defaultWeights || defaultWeights.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No default weights found' 
      }, { status: 404 });
    }
    
    // Get current weights
    const currentWeights = await prisma.team_balance_weights.findMany();
    
    if (!currentWeights || currentWeights.length === 0) {
      // No weights found, let's create them
      const createPromises = defaultWeights.map((defaultWeight: any) => {
        return prisma.team_balance_weights.create({
          data: {
            position_group: defaultWeight.position_group,
            attribute: defaultWeight.attribute,
            weight: defaultWeight.weight,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      });
      
      await Promise.all(createPromises);
    } else {
      // Update existing weights to match defaults
      const updatePromises = currentWeights.map((currentWeight: any) => {
        // Find matching default weight
        const defaultWeight = defaultWeights.find(
          (dw: any) => 
            dw.position_group === currentWeight.position_group && 
            dw.attribute === currentWeight.attribute
        );
        
        if (!defaultWeight) return Promise.resolve(); // Skip if no matching default
        
        return prisma.team_balance_weights.update({
          where: {
            weight_id: currentWeight.weight_id
          },
          data: {
            weight: defaultWeight.weight,
            updated_at: new Date()
          }
        });
      });
      
      await Promise.all(updatePromises);
    }
    
    // Get updated weights for response
    const updatedWeights = await prisma.team_balance_weights.findMany({
      orderBy: [
        { position_group: 'asc' },
        { attribute: 'asc' }
      ]
    });
    
    // Enhance with names and descriptions
    // Descriptive names for attributes
    const attributeNames: Record<string, string> = {
      'stamina_pace': 'Stamina & Pace',
      'control': 'Ball Control',
      'goalscoring': 'Finishing',
      'resilience': 'Resilience',
      'teamwork': 'Teamwork'
    };
    
    // Position group display names
    const positionGroupNames: Record<string, string> = {
      'defense': 'Defenders',
      'midfield': 'Midfielders',
      'attack': 'Attackers',
      'team': 'Team-wide'
    };
    
    // Convert to UI range and add names
    const enhancedWeights = updatedWeights.map((weight: any) => {
      const numericWeight = parseFloat(weight.weight.toString()) * 100;
      
      return {
        ...weight,
        weight: numericWeight,
        name: attributeNames[weight.attribute] || weight.attribute,
        position_group_name: positionGroupNames[weight.position_group] || weight.position_group
      };
    });
    
    return NextResponse.json({
      success: true,
      data: enhancedWeights
    });
  } catch (error) {
    console.error('Error resetting balance weights:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to reset balance weights' 
    }, { status: 500 });
  }
} 