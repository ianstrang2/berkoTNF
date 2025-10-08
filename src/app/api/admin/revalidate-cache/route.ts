import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { handleTenantError } from '@/lib/api-helpers';

// DEPRECATED: This endpoint is deprecated in favor of /api/internal/cache/invalidate
// The background job system uses the internal endpoint for batch cache invalidation
// This endpoint remains for legacy compatibility but is not actively used

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  // This is a server-to-server endpoint.
  // We expect a secret key to be passed in the authorization header.
  const authToken = (request.headers.get('authorization') || '').split('Bearer ').at(1);

  if (authToken !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { cacheKey } = body;

  if (!cacheKey) {
    return NextResponse.json({ error: 'cacheKey is required' }, { status: 400 });
  }

  // Ensure the provided key is a valid, known cache tag
  const validTags = Object.values(CACHE_TAGS);
  const isValidTag = validTags.includes(cacheKey);

  if (!isValidTag) {
    console.error(`Invalid cache tag attempted: "${cacheKey}". Valid tags:`, validTags);
    return NextResponse.json({ 
      error: `Invalid cacheKey: "${cacheKey}"`, 
      validTags: validTags,
      hint: 'Check CACHE_TAGS constants for valid values'
    }, { status: 400 });
  }

  try {
    console.log(`Revalidating cache for tag: ${cacheKey}`);
    revalidateTag(cacheKey);

    return NextResponse.json({
      success: true,
      revalidated: true,
      tag: cacheKey,
      now: Date.now(),
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 