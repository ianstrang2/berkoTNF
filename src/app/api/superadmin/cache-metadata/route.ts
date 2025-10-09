/**
 * Superadmin cache metadata endpoint
 * Shows the OLDEST cache timestamp per cache_key across ALL tenants
 * This helps identify which cache keys need updating platform-wide
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTenantError } from '@/lib/api-helpers';

// Superadmin routes use service role to bypass RLS for cross-tenant queries
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the oldest cache timestamp per cache_key across all tenants
    // Use service role to bypass RLS
    const { data: cacheMetadata, error: cacheError } = await supabaseAdmin
      .rpc('get_cache_metadata_summary'); // We'll need to create this function
    
    // If RPC doesn't exist, fall back to direct query via service role
    if (cacheError || !cacheMetadata) {
      // Direct query using Supabase client (bypasses RLS)
      const { data: rawData, error: queryError } = await supabaseAdmin
        .from('cache_metadata')
        .select('cache_key, last_invalidated, tenant_id');
      
      if (queryError) throw queryError;
      
      // Manually aggregate
      const grouped = (rawData || []).reduce((acc: any, item: any) => {
        if (!acc[item.cache_key]) {
          acc[item.cache_key] = {
            cache_key: item.cache_key,
            oldest_update: item.last_invalidated,
            newest_update: item.last_invalidated,
            tenants: new Set()
          };
        }
        acc[item.cache_key].tenants.add(item.tenant_id);
        if (new Date(item.last_invalidated) < new Date(acc[item.cache_key].oldest_update)) {
          acc[item.cache_key].oldest_update = item.last_invalidated;
        }
        if (new Date(item.last_invalidated) > new Date(acc[item.cache_key].newest_update)) {
          acc[item.cache_key].newest_update = item.last_invalidated;
        }
        return acc;
      }, {});
      
      const serializedData = Object.values(grouped).map((item: any) => ({
        cache_key: item.cache_key,
        oldest_update: item.oldest_update,
        newest_update: item.newest_update,
        tenant_count: item.tenants.size
      }));
      
      return NextResponse.json({ 
        success: true, 
        data: serializedData 
      });
    }

    /* Old Prisma code with RLS blocking:

    */

    return NextResponse.json({ 
      success: true, 
      data: cacheMetadata 
    });

  } catch (error) {
    return handleTenantError(error);
  }
}
