import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateAllTimeStats } from '@/lib/stats/updateAllTimeStats';

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    
    console.log('Starting All-Time Stats update step...');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateAllTimeStats(tx, config);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('✓ All-Time Stats updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All-Time Stats updated successfully' 
    });
  } catch (error) {
    console.error('Error in All-Time Stats update:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 