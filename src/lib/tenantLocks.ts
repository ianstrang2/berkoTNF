/**
 * Multi-Tenant Advisory Locks
 * 
 * This module provides tenant-aware advisory locks for the Capo application.
 * It ensures that locks are scoped to specific tenants, preventing cross-tenant
 * interference while maintaining the existing match locking functionality.
 * 
 * Based on SPEC_multi_tenancy.md - Advisory Lock Implementation
 */

import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import type { PrismaClient } from '@prisma/client';

/**
 * Hash a string to a 32-bit integer for PostgreSQL advisory locks
 * This ensures consistent lock keys across application restarts
 */
function hashString(input: string): number {
  const hash = createHash('sha256').update(input).digest('hex');
  // Convert first 8 hex chars to signed 32-bit integer
  return parseInt(hash.substring(0, 8), 16) | 0;
}

/**
 * Get the default tenant ID for legacy compatibility
 * This allows existing code to continue working without tenant context
 */
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Tenant-aware match lock - prevents concurrent modifications to a match within a tenant
 * This is the primary lock for match-related operations in a multi-tenant environment
 * 
 * @param tenantId - UUID of the tenant
 * @param matchId - ID of the match to lock
 * @param callback - Function to execute within the lock
 * @returns Promise with the result of the callback
 */
export async function withTenantMatchLock<T>(
  tenantId: string,
  matchId: number,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(tenantId);
  const lockKey2 = matchId;
  
  console.log(`[TENANT_LOCK] Acquiring match lock for tenant ${tenantId}, match ${matchId} (keys: ${lockKey1}, ${lockKey2})`);
  
  return prisma.$transaction(async (tx) => {
    // Acquire tenant-scoped advisory lock using PostgreSQL pg_advisory_xact_lock
    // This automatically releases when the transaction ends
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock($1::int, $2::int)`,
      lockKey1,
      lockKey2
    );
    
    console.log(`[TENANT_LOCK] Lock acquired for tenant ${tenantId}, match ${matchId}`);
    
    try {
      const result = await callback(tx as PrismaClient);
      console.log(`[TENANT_LOCK] Operation completed for tenant ${tenantId}, match ${matchId}`);
      return result;
    } catch (error) {
      console.error(`[TENANT_LOCK] Operation failed for tenant ${tenantId}, match ${matchId}:`, error);
      throw error;
    }
    // Lock is automatically released when transaction ends
  });
}

/**
 * Tenant-aware player lock - prevents concurrent modifications to a player within a tenant
 * Useful for player-specific operations like stats updates or profile changes
 * 
 * @param tenantId - UUID of the tenant
 * @param playerId - ID of the player to lock
 * @param callback - Function to execute within the lock
 * @returns Promise with the result of the callback
 */
export async function withTenantPlayerLock<T>(
  tenantId: string,
  playerId: number,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(`${tenantId}:player`);
  const lockKey2 = playerId;
  
  console.log(`[TENANT_LOCK] Acquiring player lock for tenant ${tenantId}, player ${playerId}`);
  
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock($1::int, $2::int)`,
      lockKey1,
      lockKey2
    );
    
    try {
      return await callback(tx as PrismaClient);
    } catch (error) {
      console.error(`[TENANT_LOCK] Player operation failed for tenant ${tenantId}, player ${playerId}:`, error);
      throw error;
    }
  });
}

/**
 * Legacy match lock for backward compatibility
 * Uses the default tenant ID to maintain existing functionality
 * 
 * @deprecated Use withTenantMatchLock instead for proper multi-tenant support
 * @param matchId - ID of the match to lock
 * @param callback - Function to execute within the lock
 * @returns Promise with the result of the callback
 */
export async function withMatchLock<T>(
  matchId: number,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  console.log(`[LEGACY_LOCK] Using legacy match lock for match ${matchId} - consider migrating to withTenantMatchLock`);
  return withTenantMatchLock(DEFAULT_TENANT_ID, matchId, callback);
}

/**
 * Tenant-aware global lock - for tenant-wide operations
 * Useful for operations that affect the entire tenant (e.g., bulk updates, migrations)
 * 
 * @param tenantId - UUID of the tenant
 * @param operation - String identifying the operation type
 * @param callback - Function to execute within the lock
 * @returns Promise with the result of the callback
 */
export async function withTenantGlobalLock<T>(
  tenantId: string,
  operation: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const lockKey1 = hashString(tenantId);
  const lockKey2 = hashString(operation);
  
  console.log(`[TENANT_LOCK] Acquiring global lock for tenant ${tenantId}, operation ${operation}`);
  
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock($1::int, $2::int)`,
      lockKey1,
      lockKey2
    );
    
    try {
      return await callback(tx as PrismaClient);
    } catch (error) {
      console.error(`[TENANT_LOCK] Global operation failed for tenant ${tenantId}, operation ${operation}:`, error);
      throw error;
    }
  });
}

/**
 * Check if a tenant exists and is active
 * This is a utility function to validate tenant context
 * 
 * @param tenantId - UUID of the tenant to check
 * @returns Promise<boolean> - true if tenant exists and is active
 */
export async function isValidTenant(tenantId: string): Promise<boolean> {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: {
        tenant_id: tenantId,
        is_active: true
      },
      select: {
        tenant_id: true
      }
    });
    return tenant !== null;
  } catch (error) {
    console.error(`[TENANT_LOCK] Error checking tenant validity for ${tenantId}:`, error);
    return false;
  }
}

/**
 * Get tenant context from a tenant slug
 * Useful for resolving tenant ID from user-friendly identifiers
 * 
 * @param slug - Tenant slug (e.g., 'berko-tnf')
 * @returns Promise<string | null> - tenant ID if found, null otherwise
 */
export async function getTenantIdFromSlug(slug: string): Promise<string | null> {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: {
        slug: slug,
        is_active: true
      },
      select: {
        tenant_id: true
      }
    });
    return tenant?.tenant_id || null;
  } catch (error) {
    console.error(`[TENANT_LOCK] Error getting tenant ID for slug ${slug}:`, error);
    return null;
  }
}

/**
 * Type definition for tenant context
 */
export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  isActive: boolean;
}

/**
 * Get full tenant context from tenant ID
 * Provides complete tenant information for application use
 * 
 * @param tenantId - UUID of the tenant
 * @returns Promise<TenantContext | null> - full tenant context if found
 */
export async function getTenantContext(tenantId: string): Promise<TenantContext | null> {
  try {
    const tenant = await prisma.tenants.findUnique({
      where: {
        tenant_id: tenantId
      },
      select: {
        tenant_id: true,
        slug: true,
        name: true,
        is_active: true
      }
    });
    
    if (!tenant) return null;
    
    return {
      tenantId: tenant.tenant_id,
      slug: tenant.slug,
      name: tenant.name,
      isActive: tenant.is_active ?? false
    };
  } catch (error) {
    console.error(`[TENANT_LOCK] Error getting tenant context for ${tenantId}:`, error);
    return null;
  }
}
