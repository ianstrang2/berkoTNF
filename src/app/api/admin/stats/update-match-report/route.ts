import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateMatchReportCache } from '@/lib/stats/updateMatchReportCache';

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    
    console.log('Starting Match Report Cache update step...');
    
    // Execute in a transaction with a timeout
    await prisma.$transaction(
      async (tx) => {
        await updateMatchReportCache(tx);
      },
      { timeout: 60000 } // 60 second timeout
    );
    
    console.log('✓ Match Report Cache updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Match Report Cache updated successfully' 
    });
  } catch (error) {
    console.error('Error in Match Report Cache update:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 