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
 * Middleware helper for tenant context
 * Resolves tenant from authenticated user session
 * 
 * @param request - NextRequest object (optional)
 * @param options - Configuration options
 *   - allowUnauthenticated: If true, returns DEFAULT_TENANT_ID for unauthenticated requests (DANGEROUS - use only for public routes)
 *   - throwOnMissing: If true, throws error instead of returning default (recommended for API routes)
 * @returns Promise<string> - Resolved tenant ID
 * @throws Error if tenant cannot be resolved and throwOnMissing is true
 */
export async function getTenantFromRequest(
  request?: any, 
  options: { allowUnauthenticated?: boolean; throwOnMissing?: boolean } = {}
): Promise<string> {
  try {
    const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
    const { createClient } = await import('@supabase/supabase-js');
    const { cookies } = await import('next/headers');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn(`[TENANT_CONTEXT] No session found`);
      
      if (options.throwOnMissing) {
        throw new Error('Authentication required: No session found');
      }
      
      if (options.allowUnauthenticated) {
        console.log(`[TENANT_CONTEXT] No session - using default tenant (allowUnauthenticated=true)`);
        return DEFAULT_TENANT_ID;
      }
      
      // SECURE DEFAULT: For authenticated API routes, fail instead of exposing data
      throw new Error('Authentication required: No session found');
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
    
    // Priority 1: Check app_metadata (for superadmin tenant switching)
    if (session.user.app_metadata?.tenant_id) {
      console.log(`[TENANT_CONTEXT] Resolved from app_metadata: ${session.user.app_metadata.tenant_id}`);
      return session.user.app_metadata.tenant_id;
    }
    
    // Priority 2: Check admin_profiles table (use service role)
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (adminProfile?.tenant_id) {
      console.log(`[TENANT_CONTEXT] Resolved from admin_profiles: ${adminProfile.tenant_id}`);
      return adminProfile.tenant_id;
    }
    
    // Priority 3: Check players table (phone auth users) - use service role
    const { data: playerProfile } = await supabaseAdmin
      .from('players')
      .select('tenant_id, name, player_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    
    if (playerProfile?.tenant_id) {
      console.log(`[TENANT_CONTEXT] ✅ Resolved from players:`, {
        tenant_id: playerProfile.tenant_id,
        player_name: playerProfile.name,
        player_id: playerProfile.player_id,
        auth_user_id: session.user.id
      });
      return playerProfile.tenant_id;
    }
    
    console.error(`[TENANT_CONTEXT] ❌ NO PLAYER FOUND for auth_user_id: ${session.user.id}`);
    
    // User is authenticated but has no tenant assignment
    console.error(`[TENANT_CONTEXT] SECURITY: User ${session.user.id} authenticated but has no tenant association`);
    
    // NEVER fall back to default tenant - this is a security vulnerability
    throw new Error(`SECURITY: User ${session.user.id} has no tenant association - redirect to /auth/no-club`);
    
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
