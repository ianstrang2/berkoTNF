import { NextRequest, NextResponse } from 'next/server';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';

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

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // ✅ SECURITY: Verify admin access
      await requireAdminRole(request);
      
      // ✅ SECURITY: Filter by tenant_id
      const cacheMetadata = await prisma.cache_metadata.findMany({
        where: { tenant_id: tenantId },
        orderBy: {
          cache_key: 'asc',
        },
      });

      // Return the JSON response directly
      return NextResponse.json({ success: true, data: serializeData(cacheMetadata) }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        },
      });

    } catch (error) {
      return handleTenantError(error);
    }
  });
} 