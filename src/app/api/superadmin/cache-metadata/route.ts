/**
 * Superadmin cache metadata endpoint
 * Shows the OLDEST cache timestamp per cache_key across ALL tenants
 * This helps identify which cache keys need updating platform-wide
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the oldest cache timestamp per cache_key across all tenants
    // This helps superadmin identify stale cache keys platform-wide
    const cacheMetadata = await prisma.$queryRaw<Array<{
      cache_key: string;
      oldest_update: Date;
      newest_update: Date;
      tenant_count: bigint;
    }>>`
      SELECT 
        cache_key,
        MIN(last_invalidated) as oldest_update,
        MAX(last_invalidated) as newest_update,
        COUNT(DISTINCT tenant_id)::int as tenant_count
      FROM cache_metadata
      GROUP BY cache_key
      ORDER BY cache_key ASC
    `;

    // Convert bigint to number for JSON serialization
    const serializedData = cacheMetadata.map(item => ({
      cache_key: item.cache_key,
      oldest_update: item.oldest_update,
      newest_update: item.newest_update,
      tenant_count: Number(item.tenant_count)
    }));

    return NextResponse.json({ 
      success: true, 
      data: serializedData 
    });

  } catch (error) {
    return handleTenantError(error);
  }
}
