import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch current performance weights
export async function GET() {
  try {
    // Fetch performance weights from app_config table
    const configs = await prisma.app_config.findMany({
      where: {
        config_key: {
          in: ['performance_power_weight', 'performance_goal_weight']
        }
      }
    });

    // Convert to expected format (no hardcoded defaults - values should exist in DB)
    const result = {
      power_weight: 0.5, // fallback only if DB is missing data
      goal_weight: 0.5   // fallback only if DB is missing data
    };

    configs.forEach(config => {
      if (config.config_key === 'performance_power_weight') {
        result.power_weight = parseFloat(config.config_value);
      } else if (config.config_key === 'performance_goal_weight') {
        result.goal_weight = parseFloat(config.config_value);
      }
    });

    // Warn if we're missing configs (should not happen after setup)
    if (configs.length !== 2) {
      console.warn('Missing performance weight configs in database. Expected 2, found:', configs.length);
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error fetching performance weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance weights' },
      { status: 500 }
    );
  }
}

// PUT - Update performance weights
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { power_weight, goal_weight } = body;

    // Validate weights
    if (typeof power_weight !== 'number' || typeof goal_weight !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid weight values' },
        { status: 400 }
      );
    }

    if (power_weight < 0 || power_weight > 1 || goal_weight < 0 || goal_weight > 1) {
      return NextResponse.json(
        { success: false, error: 'Weights must be between 0 and 1' },
        { status: 400 }
      );
    }

    if (Math.abs((power_weight + goal_weight) - 1) > 0.001) {
      return NextResponse.json(
        { success: false, error: 'Weights must sum to 1.0' },
        { status: 400 }
      );
    }

    // Update or create power_weight config
    await prisma.app_config.upsert({
      where: {
        config_key: 'performance_power_weight'
      },
      update: {
        config_value: power_weight.toString(),
        updated_at: new Date()
      },
      create: {
        config_key: 'performance_power_weight',
        config_value: power_weight.toString(),
        config_description: 'Weight for power rating in performance balancing algorithm',
        config_group: 'balance_algorithm',
        display_name: 'Performance Power Weight',
        display_group: 'Balance Algorithm'
      }
    });

    // Update or create goal_weight config
    await prisma.app_config.upsert({
      where: {
        config_key: 'performance_goal_weight'
      },
      update: {
        config_value: goal_weight.toString(),
        updated_at: new Date()
      },
      create: {
        config_key: 'performance_goal_weight',
        config_value: goal_weight.toString(),
        config_description: 'Weight for goal threat in performance balancing algorithm',
        config_group: 'balance_algorithm',
        display_name: 'Performance Goal Weight',
        display_group: 'Balance Algorithm'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Performance weights updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating performance weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update performance weights' },
      { status: 500 }
    );
  }
}

// DELETE - Reset to defaults
export async function DELETE() {
  try {
    // Delete custom configs to fall back to defaults (0.5 each)
    await prisma.app_config.deleteMany({
      where: {
        config_key: {
          in: ['performance_power_weight', 'performance_goal_weight']
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Performance weights reset to defaults'
    });

  } catch (error: any) {
    console.error('Error resetting performance weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset performance weights' },
      { status: 500 }
    );
  }
} 