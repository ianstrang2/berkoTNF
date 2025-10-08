/**
 * Internal cache invalidation endpoint
 * Called by background workers to trigger Next.js cache revalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { handleTenantError } from '@/lib/api-helpers';

interface CacheInvalidationRequest {
  tags: string[];
  source: string;
  requestId: string;
}

interface CacheInvalidationResponse {
  success: boolean;
  invalidated_tags: string[];
  failed_tags: string[];
  error?: string;
}

// Simple internal authentication
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-worker-key';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔄 Cache invalidation request received');

  try {
    // Verify internal authentication
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${INTERNAL_API_KEY}`;
    
    if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cache invalidation request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized - Invalid or missing API key',
          invalidated_tags: [],
          failed_tags: []
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CacheInvalidationRequest = await request.json();
    const { tags, source, requestId } = body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: tags must be a non-empty array',
          invalidated_tags: [],
          failed_tags: tags || []
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Invalidating ${tags.length} cache tags from ${source} (${requestId}):`, tags);

    const invalidated_tags: string[] = [];
    const failed_tags: string[] = [];

    // Process each tag
    for (const tag of tags) {
      try {
        console.log(`🔄 Revalidating cache tag: ${tag}`);
        revalidateTag(tag);
        invalidated_tags.push(tag);
        console.log(`✅ Successfully revalidated tag: ${tag}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to revalidate tag ${tag}:`, errorMessage);
        failed_tags.push(tag);
      }
    }

    const allSuccessful = failed_tags.length === 0;
    const response: CacheInvalidationResponse = {
      success: allSuccessful,
      invalidated_tags,
      failed_tags,
      error: allSuccessful ? undefined : `Failed to invalidate ${failed_tags.length} tags`
    };

    console.log(`${allSuccessful ? '✅' : '⚠️'} Cache invalidation completed: ${invalidated_tags.length} successful, ${failed_tags.length} failed`);

    return NextResponse.json(response, {
      status: allSuccessful ? 200 : 207 // 207 Multi-Status for partial success
    });

  } catch (error) {
    return handleTenantError(error);
  }
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'cache-invalidation',
    timestamp: new Date().toISOString()
  });
}
