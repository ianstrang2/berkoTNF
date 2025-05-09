import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming prisma client is exported from here

// Helper to serialize data (especially for BigInt and Date types if needed)
const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return Number(value); // Convert BigInt to Number
    }
    // Add other custom serializations if necessary, e.g., for dates
    return value;
  }));
};

export const dynamic = 'force-dynamic'; // Ensure this is active to opt out of caching

export async function GET() {
  try {
    const cacheMetadata = await prisma.cache_metadata.findMany({
      orderBy: {
        cache_key: 'asc', // Optional: order by cache_key for consistent results
      },
    });

    // Return the JSON response directly
    return NextResponse.json({ success: true, data: serializeData(cacheMetadata) });

  } catch (error) {
    console.error('Error fetching cache_metadata:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cache metadata', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 