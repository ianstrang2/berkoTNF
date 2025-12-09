/**
 * Tenant Context Management
 * 
 * This module provides utilities for managing tenant context throughout the application.
 * It includes functions for resolving tenant information and maintaining context.
 * 
 * Phase 2 Enhancement: Added withTenantContext wrapper for automatic RLS context
 * via AsyncLocalStorage and Prisma middleware.
 * 
 * Based on SPEC_multi_tenancy.md - Tenant Context Implementation
 */

import { DEFAULT_TENANT_ID, getTenantContext as getTenantDetails, TenantContext } from './tenantLocks';
import { tenantContext } from './prisma';

/**
 * Get the current tenant ID for the application
 * 
 * DEPRECATED: This synchronous function cannot resolve tenant from async sources.
 * Use getTenantFromRequest() in API routes instead.
 * 
 * @returns string - The default tenant ID
 * @deprecated Use getTenantFromRequest() for proper tenant resolution
 */
export function getCurrentTenantId(): string {
  console.warn(`[TENANT_CONTEXT] getCurrentTenantId() is deprecated - use getTenantFromRequest() instead`);
  const tenantId = DEFAULT_TENANT_ID;
  console.log(`[TENANT_CONTEXT] Returning default tenant: ${tenantId}`);
  return tenantId;
}

/**
 * Set RLS context for the current database session
 * This must be called before any database operations when RLS is enabled
 * 
 * @param tenantId - UUID of the tenant to set as context
 */
export async function setRLSContext(tenantId: string): Promise<void> {
  const { prisma } = await import('@/lib/prisma');
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
}

/**
 * Get the current tenant context with full details
 * 
 * @param request - Optional NextRequest object for tenant resolution
 * @returns Promise<TenantContext | null> - Full tenant context or null if not found
 */
export async function getCurrentTenantContext(request?: any): Promise<TenantContext | null> {
  const tenantId = request ? await getTenantFromRequest(request) : getCurrentTenantId();
  return getTenantDetails(tenantId);
}

/**
 * Validate that a tenant ID is valid and active
 * 
 * @param tenantId - The tenant ID to validate
 * @returns Promise<boolean> - true if the tenant is valid and active
 */
export async function validateTenantId(tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  
  try {
    const context = await getTenantDetails(tenantId);
    return context !== null && context.isActive;
  } catch (error) {
    console.error(`[TENANT_CONTEXT] Error validating tenant ${tenantId}:`, error);
    return false;
  }
}

/**
 * Ensure a tenant ID is provided, falling back to default if needed
 * 
 * @param tenantId - Optional tenant ID
 * @returns string - Valid tenant ID (provided or default)
 */
export function ensureTenantId(tenantId?: string | null): string {
  if (tenantId && tenantId.trim()) {
    return tenantId.trim();
  }
  
  console.log(`[TENANT_CONTEXT] No tenant ID provided, using default: ${DEFAULT_TENANT_ID}`);
  return DEFAULT_TENANT_ID;
}

/**
 * Get tenant-specific configuration value
 * This will be useful for per-tenant settings and customization
 * 
 * @param key - Configuration key
 * @param tenantId - Optional tenant ID (defaults to current tenant)
 * @returns Promise<string | null> - Configuration value or null if not found
 */
export async function getTenantConfig(key: string, tenantId?: string): Promise<string | null> {
  const effectiveTenantId = tenantId || getCurrentTenantId();
  
  // TODO: Implement tenant-specific configuration lookup
  // This will query app_config with tenant scoping
  
  console.log(`[TENANT_CONTEXT] Getting config ${key} for tenant ${effectiveTenantId}`);
  return null; // Placeholder
}

/**
 * Type for tenant resolution result
 */
export interface TenantResolutionResult {
  tenantId: string;
  source: 'default' | 'session' | 'token' | 'header';
  isValid: boolean;
}

/**
 * Resolve tenant context from various sources
 * This is a placeholder for future implementation of proper tenant resolution
 * 
 * @returns Promise<TenantResolutionResult> - Tenant resolution result
 */
export async function resolveTenantContext(): Promise<TenantResolutionResult> {
  // TODO: Implement proper tenant resolution logic
  // Priority order:
  // 1. Admin session context
  // 2. RSVP token context  
  // 3. Request headers
  // 4. Default tenant
  
  const tenantId = getCurrentTenantId();
  const isValid = await validateTenantId(tenantId);
  
  return {
    tenantId,
    source: 'default',
    isValid
  };
}

/**
 * Resolve tenant ID from authenticated request
 * 
 * This function uses a multi-source priority hierarchy to resolve tenant context.
 * The cookie-based Priority 0 exists to solve a specific Supabase architecture constraint.
 * 
 * ============================================================================
 * PERFORMANCE OPTIMIZATION (Dec 2025)
 * ============================================================================
 * 
 * This function now uses cached auth via getAuthenticatedUser() to prevent
 * redundant Supabase Auth API calls. When multiple API routes call this in
 * parallel (e.g., page load), only ONE getUser() call is made.
 * 
 * Before: 5 parallel API calls → 10+ getUser() calls → rate limiting → 16s timeout
 * After: 5 parallel API calls → 1 getUser() call (cached) → ~50ms
 * 
 * ============================================================================
 * WHY WE USE A COOKIE (Priority 0)
 * ============================================================================
 * 
 * PROBLEM: Superadmin tenant switching has a JWT refresh timing issue
 * 
 * When a superadmin switches tenants, we update their app_metadata in Supabase's
 * database. However, the JWT in the browser's cookies is immutable - it still
 * contains the OLD tenant_id until the client calls refreshSession().
 * 
 * Why can't the server just refresh the JWT?
 * - Supabase uses single-use refresh tokens (security: prevents replay attacks)
 * - Client SDK has an auto-refresh timer that runs every 30 seconds
 * - If server uses the refresh token, it invalidates it for the client
 * - Client's next auto-refresh fails: "Invalid Refresh Token: Already Used"
 * - User gets logged out randomly 30-60 seconds after switching
 * 
 * The cookie-based approach avoids this by:
 * - Not touching Supabase's refresh token mechanism
 * - Providing immediate tenant context (no timing issues)
 * - Letting client SDK continue managing session normally
 * - Allowing JWT to eventually "catch up" via normal client refresh
 * 
 * ============================================================================
 * WHY THIS IS SECURE
 * ============================================================================
 * 
 * The cookie is NOT a backdoor that bypasses authentication:
 * 
 * 1. VALIDATED: Cookie is only honored if user is verified superadmin
 *    - We check session.user.id (from JWT - can't be forged)
 *    - We verify user_role === 'superadmin' in database
 *    - Non-superadmin users can't exploit the cookie
 * 
 * 2. HTTP-ONLY: Cookie can't be read or modified by client JavaScript
 *    - XSS attacks can't steal or manipulate it
 *    - Only server-side code can set/read it
 * 
 * 3. EPHEMERAL: Cookie is cleared on logout
 *    - Not a long-lived alternative auth mechanism
 *    - Cleaned up automatically when session ends
 * 
 * 4. DEFENSE-IN-DEPTH: All queries still require explicit tenant_id filtering
 *    - Cookie only helps RESOLVE tenant, doesn't bypass RLS
 *    - Database queries still enforce tenant isolation
 * 
 * ============================================================================
 * PRIORITY ORDER AND REASONING
 * ============================================================================
 * 
 * Priority 0: superadmin_selected_tenant cookie (HTTP-only)
 *   - For: Superadmin tenant switching
 *   - Why first: Provides immediate context while JWT is stale
 *   - Validation: Only honored if user is verified superadmin
 *   - Set by: /api/auth/superadmin/switch-tenant
 * 
 * Priority 1: session.user.app_metadata.tenant_id (JWT claim)
 *   - For: Superadmin tenant switching (JWT-based, after refresh)
 *   - Why second: Eventually contains updated tenant after client refresh
 *   - Validation: JWT is signed by Supabase (can't be forged)
 *   - Set by: Supabase when updateUserById() is called
 * 
 * Priority 2: admin_profiles.tenant_id (Database lookup)
 *   - For: Regular admin users (email/password auth)
 *   - Why third: Admins belong to a specific tenant
 *   - Validation: Authenticated user has admin_profile record
 *   - Set by: Admin signup process
 * 
 * Priority 3: players.tenant_id (Database lookup)
 *   - For: Player users (phone auth)
 *   - Why last: Players belong to a specific tenant
 *   - Validation: Authenticated user has player record
 *   - Set by: Phone auth signup process
 * 
 * If none match: Throw error (user has no tenant association)
 * 
 * ============================================================================
 * 
 * @param request - NextRequest object (optional)
 * @param options - Configuration options
 *   - allowUnauthenticated: If true, returns DEFAULT_TENANT_ID for unauthenticated requests (DANGEROUS - use only for public routes)
 *   - throwOnMissing: If true, throws error instead of returning default (recommended for API routes)
 * @returns Promise<string> - Resolved tenant ID
 * @throws Error if tenant cannot be resolved and throwOnMissing is true
 * 
 * @see ANSWER_TO_CORE_QUESTIONS.md - Technical deep-dive on why cookie is needed
 * @see THE_ACTUAL_CONSTRAINT.md - Supabase refresh token race condition explained
 */
export async function getTenantFromRequest(
  request?: any, 
  options: { allowUnauthenticated?: boolean; throwOnMissing?: boolean } = {}
): Promise<string> {
  const startTime = Date.now();
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const { cookies } = await import('next/headers');
    const { getAuthenticatedUser } = await import('@/lib/auth/cachedAuth');
    
    const cookieStore = cookies();
    
    // PERFORMANCE FIX (Dec 2025): Use cached auth to prevent redundant getUser() calls
    // This is the key optimization - React's cache() deduplicates calls within same request
    const { user } = await getAuthenticatedUser();
    
    if (!user) {
      console.warn(`[TENANT_CONTEXT] No authenticated user found`);
      
      if (options.throwOnMissing) {
        throw new Error('Authentication required: No session found');
      }
      
      if (options.allowUnauthenticated) {
        console.log(`[TENANT_CONTEXT] No user - using default tenant (allowUnauthenticated=true)`);
        return DEFAULT_TENANT_ID;
      }
      
      // SECURE DEFAULT: For authenticated API routes, fail instead of exposing data
      throw new Error('Authentication required: No authenticated user');
    }
    
    // Use Supabase admin client for cross-tenant tenant resolution
    // This avoids RLS blocking the tenant lookup itself
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Priority 0: Check superadmin_selected_tenant cookie (for tenant switching)
    // This bypasses JWT refresh timing issues - cookie is immediately available
    const cookieTenant = cookieStore.get('superadmin_selected_tenant');
    
    if (cookieTenant?.value) {
      const cookieCheckStart = Date.now();
      // Verify this is actually a superadmin user
      const { data: superadminProfile } = await supabaseAdmin
        .from('admin_profiles')
        .select('user_role')
        .eq('user_id', user.id)
        .maybeSingle();
      console.log(`⏱️ [TENANT] Cookie verification query took ${Date.now() - cookieCheckStart}ms`);
      
      if (superadminProfile?.user_role === 'superadmin') {
        console.log(`[TENANT_CONTEXT] ✅ Resolved from superadmin cookie: ${cookieTenant.value} (total: ${Date.now() - startTime}ms)`);
        return cookieTenant.value;
      } else {
        // Not a superadmin - clear the cookie (security measure)
        console.warn(`[TENANT_CONTEXT] ⚠️ Non-superadmin has tenant cookie - clearing`);
        cookieStore.delete('superadmin_selected_tenant');
      }
    }
    
    // Priority 1: Check app_metadata (for superadmin tenant switching - JWT based)
    if (user.app_metadata?.tenant_id) {
      console.log(`[TENANT_CONTEXT] ✅ Resolved from app_metadata: ${user.app_metadata.tenant_id}`);
      return user.app_metadata.tenant_id;
    }
    
    // Priority 2: Check admin_profiles table (use service role)
    const adminCheckStart = Date.now();
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle();
    console.log(`⏱️ [TENANT] Admin profile query took ${Date.now() - adminCheckStart}ms`);
    
    if (adminProfile?.tenant_id) {
      console.log(`[TENANT_CONTEXT] Resolved from admin_profiles: ${adminProfile.tenant_id} (total: ${Date.now() - startTime}ms)`);
      return adminProfile.tenant_id;
    }
    
    // Priority 3: Check players table (phone auth users) - use service role
    const playerCheckStart = Date.now();
    const { data: playerProfile } = await supabaseAdmin
      .from('players')
      .select('tenant_id, name, player_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    console.log(`⏱️ [TENANT] Player profile query took ${Date.now() - playerCheckStart}ms`);
    
    if (playerProfile?.tenant_id) {
      console.log(`[TENANT_CONTEXT] ✅ Resolved from players (total: ${Date.now() - startTime}ms):`, {
        tenant_id: playerProfile.tenant_id,
        player_name: playerProfile.name,
        player_id: playerProfile.player_id,
        auth_user_id: user.id
      });
      return playerProfile.tenant_id;
    }
    
    console.error(`[TENANT_CONTEXT] ❌ NO PLAYER FOUND for auth_user_id: ${user.id}`);
    
    // User is authenticated but has no tenant assignment
    console.error(`[TENANT_CONTEXT] SECURITY: User ${user.id} authenticated but has no tenant association`);
    
    // NEVER fall back to default tenant - this is a security vulnerability
    throw new Error(`SECURITY: User ${user.id} has no tenant association - redirect to /auth/no-club`);
    
  } catch (error) {
    console.error(`[TENANT_CONTEXT] Error resolving tenant:`, error);
    
    if (options.throwOnMissing || error.message?.includes('Authentication required')) {
      throw error;
    }
    
    // Only fall back to default if explicitly allowed AND error is not auth-related
    if (options.allowUnauthenticated) {
      console.warn(`[TENANT_CONTEXT] Error occurred but allowUnauthenticated=true, using default`);
      return DEFAULT_TENANT_ID;
    }
    
    throw error;
  }
}

/**
 * Get tenant from request with secure defaults for authenticated API routes
 * This is the recommended function for all authenticated API endpoints
 * Throws error if tenant cannot be resolved instead of falling back
 * 
 * @param request - NextRequest object
 * @returns Promise<string> - Resolved tenant ID
 * @throws Error if tenant cannot be resolved
 */
export async function requireTenantFromRequest(request?: any): Promise<string> {
  return getTenantFromRequest(request, { throwOnMissing: true });
}

/**
 * Constants for tenant context
 */
export const TENANT_CONSTANTS = {
  DEFAULT_TENANT_ID,
  TENANT_HEADER_NAME: 'X-Tenant-ID',
  TENANT_QUERY_PARAM: 'tenant',
  SESSION_TENANT_KEY: 'tenantId'
} as const;

/**
 * Phase 2: Wrap API route handler with automatic tenant context
 * 
 * This function resolves the tenant from the request and sets it in AsyncLocalStorage,
 * making it available to Prisma middleware for automatic RLS context setting.
 * 
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withTenantContext(request, async (tenantId) => {
 *     // Tenant context is automatically available to Prisma
 *     const players = await prisma.players.findMany({
 *       where: { tenant_id: tenantId } // Still required for defense-in-depth
 *     });
 *     
 *     return NextResponse.json({ players });
 *   });
 * }
 * ```
 * 
 * @param request - NextRequest object
 * @param handler - Async handler function that receives the resolved tenantId
 * @param options - Optional configuration
 * @returns Promise<T> - Result from the handler function
 * @throws Error if tenant cannot be resolved
 */
export async function withTenantContext<T>(
  request: any,
  handler: (tenantId: string) => Promise<T>,
  options?: { allowUnauthenticated?: boolean; throwOnMissing?: boolean }
): Promise<T> {
  const tenantId = await getTenantFromRequest(request, options);
  
  console.log(`[WITH_TENANT_CONTEXT] Setting tenant context: ${tenantId}`);
  
  // Run handler within tenant context (available to Prisma middleware)
  return tenantContext.run({ tenantId }, () => {
    console.log(`[WITH_TENANT_CONTEXT] Inside context, tenant: ${tenantId}`);
    return handler(tenantId);
  });
}

/**
 * Phase 2: Set tenant context for background jobs
 * 
 * Background jobs should pass tenant_id in their payload and use this function
 * to set context before performing database operations.
 * 
 * Usage in background jobs:
 * ```typescript
 * async function processJob(job: { tenant_id: string, data: any }) {
 *   return withBackgroundTenantContext(job.tenant_id, async () => {
 *     // Tenant context is automatically available to Prisma
 *     await prisma.some_table.updateMany({ ... });
 *   });
 * }
 * ```
 * 
 * @param tenantId - Tenant ID from job payload
 * @param handler - Async handler function to execute with tenant context
 * @returns Promise<T> - Result from the handler function
 */
export async function withBackgroundTenantContext<T>(
  tenantId: string,
  handler: () => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error('[TENANT_CONTEXT] Background job missing tenant_id in payload');
  }
  
  console.log(`[TENANT_CONTEXT] Setting background job context: ${tenantId}`);
  return tenantContext.run({ tenantId }, handler);
}

/**
 * Phase 2: Get current tenant context (if available)
 * 
 * This can be used to check if code is running within a tenant context.
 * Useful for debugging or conditional logic.
 * 
 * @returns string | undefined - Current tenant ID or undefined if no context
 */
export function getCurrentTenantFromContext(): string | undefined {
  const context = tenantContext.getStore();
  return context?.tenantId;
}
