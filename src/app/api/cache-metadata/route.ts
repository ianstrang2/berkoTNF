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

// export const dynamic = 'force-dynamic'; // Keep for now, but headers are more explicit

export async function GET() {
  try {
    const cacheMetadata = await prisma.cache_metadata.findMany({
      orderBy: {
        cache_key: 'asc', // Optional: order by cache_key for consistent results
      },
    });

    // It's generally better to set cache-control headers on the response
    // if you need more fine-grained control, but `export const dynamic = 'force-dynamic'`
    // is the simpler way for Next.js App Router to opt out of data caching for a route.
    const response = NextResponse.json({ success: true, data: serializeData(cacheMetadata) });

    // Set explicit no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;

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