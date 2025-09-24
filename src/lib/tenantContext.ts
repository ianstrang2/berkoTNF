/**
 * Tenant Context Management
 * 
 * This module provides utilities for managing tenant context throughout the application.
 * It includes functions for resolving tenant information and maintaining context.
 * 
 * Based on SPEC_multi_tenancy.md - Tenant Context Implementation
 */

import { DEFAULT_TENANT_ID, getTenantContext as getTenantDetails, TenantContext } from './tenantLocks';

/**
 * Get the current tenant ID for the application
 * 
 * For now, this returns the default tenant ID to maintain backward compatibility.
 * In the future, this will be enhanced to support:
 * - Session-based tenant resolution for admin users
 * - Token-based tenant resolution for RSVP functionality  
 * - Request context-based tenant resolution
 * 
 * @returns string - The current tenant ID
 */
export function getCurrentTenantId(): string {
  // TODO: Implement proper tenant resolution based on:
  // - Admin session context
  // - RSVP token context
  // - Request headers
  // - Default tenant fallback
  
  return DEFAULT_TENANT_ID;
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
 * @returns Promise<TenantContext | null> - Full tenant context or null if not found
 */
export async function getCurrentTenantContext(): Promise<TenantContext | null> {
  const tenantId = getCurrentTenantId();
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
 * This will be used in API routes to ensure tenant context is available
 * 
 * @param request - Request object (placeholder for future implementation)
 * @returns Promise<string> - Resolved tenant ID
 */
export async function getTenantFromRequest(request?: any): Promise<string> {
  // TODO: Implement request-based tenant resolution
  // This will examine:
  // - Request headers
  // - Session data
  // - URL parameters
  // - Authentication context
  
  console.log(`[TENANT_CONTEXT] Getting tenant from request - using default for now`);
  return getCurrentTenantId();
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
