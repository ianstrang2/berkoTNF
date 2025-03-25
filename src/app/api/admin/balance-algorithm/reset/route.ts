import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST handler - reset balance algorithm weights to defaults
export async function POST() {
  try {
    // Get the default values from team_balance_weights_defaults table
    const defaultWeights = await prisma.team_balance_weights_defaults.findMany();
    
    // Reset all weights from team_balance_weights table
    // First, get all current weights
    const currentWeights = await prisma.team_balance_weights.findMany();
    
    // Update each weight to match the default value
    for (const current of currentWeights) {
      // Find the matching default weight
      const defaultWeight = defaultWeights.find(
        def => def.position_group === current.position_group && def.attribute === current.attribute
      );
      
      if (defaultWeight) {
        await prisma.team_balance_weights.update({
          where: { weight_id: current.weight_id },
          data: { weight: defaultWeight.weight }
        });
      }
    }
    
    // Fetch the updated weights
    const updatedWeights = await prisma.team_balance_weights.findMany({
      orderBy: {
        position_group: 'asc'
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Balance algorithm weights reset to defaults',
      data: updatedWeights.map(w => ({
        attribute_id: w.weight_id,
        name: w.attribute,
        description: w.position_group,
        weight: Number(w.weight)
      }))
    });
  } catch (error) {
    console.error('Error resetting balance algorithm weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset balance algorithm weights' },
      { status: 500 }
    );
  }
} 