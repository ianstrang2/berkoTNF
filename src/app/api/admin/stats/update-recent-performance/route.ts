import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateRecentPerformance } from '@/lib/stats/updateRecentPerformance';

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    
    console.log('Starting Recent Performance update step...');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateRecentPerformance(tx);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('✓ Recent Performance updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Recent Performance updated successfully' 
    });
  } catch (error) {
    console.error('Error in Recent Performance update:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 