import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET handler - retrieve balance algorithm weights
export async function GET() {
  try {
    // Fetch balance weights from database
    const weights = await prisma.team_balance_weights.findMany({
      orderBy: {
        position_group: 'asc'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: weights.map(w => ({
        attribute_id: w.weight_id,
        name: w.attribute,
        description: w.position_group,
        weight: Number(w.weight)
      }))
    });
  } catch (error) {
    console.error('Error fetching balance algorithm weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balance algorithm weights' },
      { status: 500 }
    );
  }
}

// PUT handler - update balance algorithm weights
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { weights } = body;
    
    if (!weights || !Array.isArray(weights)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    // For each weight, update in database
    for (const weight of weights) {
      await prisma.team_balance_weights.update({
        where: { weight_id: weight.attribute_id },
        data: { weight: weight.weight }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating balance algorithm weights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update balance algorithm weights' },
      { status: 500 }
    );
  }
} 