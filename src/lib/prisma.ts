import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks';

/**
 * AsyncLocalStorage for tenant context
 * Allows passing tenant context through the call stack without explicit parameters
 * This is used by Prisma middleware to automatically set RLS context
 */
export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

// Create a custom type that extends the PrismaClient to include our new models
type CustomPrismaClient = PrismaClient & {
  app_config: any;
  app_config_defaults: any;
  team_size_templates: any;
  team_size_templates_defaults: any;
  team_balance_weights: any;
  team_balance_weights_defaults: any;
  upcoming_matches: any;
  upcoming_match_players: any;
  match_player_pool: any;
  aggregated_season_stats: any;
  aggregated_recent_performance: any;
};

// Initialize Prisma client with RLS middleware
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
  });
  
  /**
   * Phase 2 RLS Middleware
   * Automatically sets app.tenant_id before each query if tenant context is available
   * This provides transparent RLS enforcement for all Prisma queries
   * 
   * IMPORTANT: This is a BACKUP layer. Explicit where: { tenant_id } filters
   * are still required for defense-in-depth security.
   * 
   * FIXED: Prevents infinite recursion by skipping middleware for the set_config query itself
   */
  let isSettingContext = false; // Flag to prevent recursion
  
  client.$use(async (params, next) => {
    // Skip middleware if we're already setting context (prevent infinite loop)
    if (isSettingContext) {
      return next(params);
    }
    
    const context = tenantContext.getStore();
    
    if (context?.tenantId) {
      try {
        // Set flag to prevent recursion
        isSettingContext = true;
        
        // Set RLS context for this query session
        // Using 'false' for session-local (persists for entire request)
        // Changed from 'true' because transaction-local was clearing too early
        await client.$executeRawUnsafe(
          `SELECT set_config('app.tenant_id', '${context.tenantId}', false)`
        );
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PRISMA_MIDDLEWARE] Set RLS context: ${context.tenantId}`);
        }
      } catch (error) {
        console.error('[PRISMA_MIDDLEWARE] Failed to set RLS context:', error);
        // Don't fail the query - explicit filtering is still enforced
      } finally {
        // Always reset flag after setting context
        isSettingContext = false;
      }
    } else {
      // No tenant context available
      // This is expected for:
      // 1. Cross-tenant auth lookups (using service role)
      // 2. Public routes (no authentication required)
      // 3. Background jobs (should set context explicitly)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PRISMA_MIDDLEWARE] No tenant context - RLS may block query');
      }
    }
    
    return next(params);
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[PRISMA] Client initialized with RLS middleware');
  }
  
  return client as CustomPrismaClient;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Clear any cached Prisma client to ensure we use the new one with logging
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;