import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateHalfAndFullSeasonStats } from '@/lib/stats/updateHalfAndFullSeasonStats';

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    
    console.log('Starting Half & Full Season Stats update step...');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateHalfAndFullSeasonStats(tx, config);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('✓ Half & Full Season Stats updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Half & Full Season Stats updated successfully' 
    });
  } catch (error) {
    console.error('Error in Half & Full Season Stats update:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 