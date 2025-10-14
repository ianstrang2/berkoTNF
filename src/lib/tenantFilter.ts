/**
 * Type-safe helper to enforce tenant_id filtering on all tenant-scoped queries.
 * 
 * This provides compile-time safety to prevent data leaks when RLS is disabled
 * on aggregated tables (read-only tables populated by background jobs).
 * 
 * WHY THIS EXISTS:
 * - Aggregated tables have RLS disabled (background jobs can't set session context)
 * - All security relies on explicit WHERE tenant_id = filtering
 * - This helper makes it impossible to forget tenant filtering
 * 
 * @throws Error if tenantId is null/undefined
 * 
 * @example
 * // ✅ CORRECT - Enforces tenant_id at compile time
 * const stats = await prisma.aggregated_season_stats.findMany({
 *   where: withTenantFilter(tenantId, { 
 *     season_start_date: startDate 
 *   })
 * });
 * 
 * @example
 * // ✅ CORRECT - Works with no additional filters
 * const stats = await prisma.aggregated_season_stats.findMany({
 *   where: withTenantFilter(tenantId)
 * });
 * 
 * @example
 * // ❌ FORBIDDEN - Missing tenant isolation (security risk)
 * const stats = await prisma.aggregated_season_stats.findMany({
 *   where: { season_start_date: startDate } // Missing tenant_id!
 * });
 */
export function withTenantFilter<T extends Record<string, any>>(
  tenantId: string | null | undefined,
  additionalWhere?: T
): T & { tenant_id: string } {
  if (!tenantId) {
    const error = new Error(
      '[SECURITY] Tenant ID is required for tenant-scoped queries. ' +
      'This query would leak data across tenants. ' +
      'Check that tenantId is being passed correctly from withTenantContext().'
    );
    console.error('[TENANT_FILTER]', error.message, {
      stack: error.stack,
      providedTenantId: tenantId,
      additionalWhere
    });
    throw error;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TENANT_FILTER] ✅ Tenant filter applied: ${tenantId}`);
  }
  
  return {
    tenant_id: tenantId,
    ...additionalWhere,
  } as T & { tenant_id: string };
}

/**
 * Validate that a tenant ID is a valid UUID format
 * Useful for catching bugs early before database queries fail
 */
export function validateTenantId(tenantId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}




