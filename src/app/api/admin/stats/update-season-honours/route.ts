import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateSeasonHonours } from '@/lib/stats/updateSeasonHonours';

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    
    console.log('Starting Season Honours update step...');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateSeasonHonours(tx, config);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('✓ Season Honours updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Season Honours updated successfully' 
    });
  } catch (error) {
    console.error('Error in Season Honours update:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 