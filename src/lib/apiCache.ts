import { prisma } from './prisma';

// Cache key mapping
export type CacheKey = 'season_stats' | 'all_time_stats' | 'hall_of_fame' | 'match_report' | 'upcoming_match' | 'honour_roll';

// Cache storage - in-memory for simplicity
interface CacheEntry {
  data: any;
  timestamp: number;
  dependencyType: string;
}

// TTL values in milliseconds
const TTL_VALUES: Record<string, number> = {
  match_result: 3600000, // 1 hour
  match_report: 1800000, // 30 minutes
  squad_selection: 300000, // 5 minutes
};

class ApiCache {
  private cache: Map<string, CacheEntry>;
  private isInitialized: boolean = false;

  constructor() {
    this.cache = new Map();
  }

  // Initialize cache with last invalidation timestamps from DB
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const cacheMetadata = await prisma.cache_metadata.findMany();
      
      // Mark initialization as complete
      this.isInitialized = true;
      
      return cacheMetadata;
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      // Mark as initialized anyway to prevent constant retries
      this.isInitialized = true;
      return [];
    }
  }

  // Check if a cache entry is valid
  async isValid(cacheKey: CacheKey, specificParam?: string): Promise<boolean> {
    await this.initialize();
    
    const fullKey = specificParam ? `${cacheKey}:${specificParam}` : cacheKey;
    const cacheEntry = this.cache.get(fullKey);
    
    if (!cacheEntry) return false;
    
    try {
      // Check database for last invalidation timestamp
      const metadata = await prisma.cache_metadata.findUnique({
        where: { cache_key: cacheKey }
      });
      
      if (!metadata) return false;
      
      const lastInvalidated = new Date(metadata.last_invalidated).getTime();
      const cacheTime = cacheEntry.timestamp;
      
      // If cache was created before last invalidation, it's invalid
      if (cacheTime < lastInvalidated) return false;
      
      // Check TTL
      const now = Date.now();
      const ttl = TTL_VALUES[metadata.dependency_type] || 3600000; // Default 1 hour
      
      return (now - cacheTime) < ttl;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Get cached data
  async get(cacheKey: CacheKey, specificParam?: string, ignoreValidation: boolean = false): Promise<any | null> {
    const fullKey = specificParam ? `${cacheKey}:${specificParam}` : cacheKey;
    
    // If ignoreValidation is true, return cache data regardless of validity
    if (ignoreValidation) {
      return this.cache.get(fullKey)?.data || null;
    }
    
    // Check if cache is valid
    const isValid = await this.isValid(cacheKey, specificParam);
    
    if (!isValid) {
      return null;
    }
    
    return this.cache.get(fullKey)?.data || null;
  }

  // Set cache data
  set(cacheKey: CacheKey, data: any, specificParam?: string): void {
    const fullKey = specificParam ? `${cacheKey}:${specificParam}` : cacheKey;
    
    // Get dependency type from cache key
    let dependencyType = 'match_result'; // Default
    
    if (cacheKey === 'match_report') {
      dependencyType = 'match_report';
    } else if (cacheKey === 'upcoming_match') {
      dependencyType = 'squad_selection';
    }
    
    this.cache.set(fullKey, {
      data,
      timestamp: Date.now(),
      dependencyType
    });
  }

  // Clear specific cache or clear all if no key provided
  clear(cacheKey?: CacheKey, specificParam?: string): void {
    if (!cacheKey) {
      this.cache.clear();
      return;
    }
    
    if (specificParam) {
      this.cache.delete(`${cacheKey}:${specificParam}`);
    } else {
      // Clear all entries with this key prefix
      for (const key of this.cache.keys()) {
        if (key === cacheKey || key.startsWith(`${cacheKey}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  // Manually invalidate a cache key in the database
  async invalidate(cacheKey: CacheKey): Promise<void> {
    try {
      await prisma.cache_metadata.update({
        where: { cache_key: cacheKey },
        data: { last_invalidated: new Date() }
      });
      
      // Also clear from in-memory cache
      this.clear(cacheKey);
    } catch (error) {
      console.error(`Failed to invalidate cache for ${cacheKey}:`, error);
    }
  }
}

// Create singleton instance
const apiCache = new ApiCache();

export default apiCache; 