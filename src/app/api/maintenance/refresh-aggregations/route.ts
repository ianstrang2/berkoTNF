import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiCache from '@/lib/apiCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('Starting refresh-aggregations endpoint');
  
  try {
    console.log('Refreshing cache metadata only...');
    
    // Clear all caches
    console.log('About to clear apiCache');
    apiCache.clear();
    console.log('apiCache cleared successfully');
    
    // Update cache metadata timestamps only
    const now = new Date();
    console.log('About to start prisma transaction');
    
    try {
      // Simple query to test database connection
      console.log('Testing database connection...');
      await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log('Database connection successful');
    } catch (connError) {
      console.error('Database connection test failed:', connError);
      console.error('Connection error type:', typeof connError);
      console.error('Connection error name:', connError?.name);
      console.error('Connection error message:', connError?.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to database',
          details: connError instanceof Error ? connError.message : 'Unknown connection error' 
        },
        { status: 500 }
      );
    }
    
    // Attempt the actual transaction with a timeout
    try {
      // For array-style transactions, we can't use timeout options directly
      // Using the function-style transaction instead which supports timeouts
      await prisma.$transaction(async (tx) => {
        await tx.cache_metadata.updateMany({
          data: { last_invalidated: now }
        });
      }, {
        timeout: 30000, // 30 second timeout
        maxWait: 5000   // 5 second wait for connection
      });
      console.log('Transaction completed successfully');
    } catch (txError) {
      console.error('Transaction failed:', txError);
      console.error('Transaction error type:', typeof txError);
      console.error('Transaction error name:', txError?.name);
      console.error('Transaction error message:', txError?.message);
      throw txError; // Re-throw to be caught by outer catch
    }
    
    console.log('Cache refresh completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache refreshed successfully',
      timestamp: now
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh cache',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 