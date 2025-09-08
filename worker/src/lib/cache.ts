/**
 * Cache invalidation logic for background worker
 * Handles calling the Next.js cache invalidation endpoint
 */

import fetch from 'node-fetch';
import { CacheInvalidationRequest, CacheInvalidationResponse } from '../types/jobTypes.js';

const CACHE_INVALIDATION_ENDPOINT = process.env.CACHE_INVALIDATION_URL || 'http://localhost:3000/api/internal/cache/invalidate';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export async function invalidateCache(
  tags: string[],
  requestId: string,
  source: string = 'background-worker'
): Promise<CacheInvalidationResponse> {
  const payload: CacheInvalidationRequest = {
    tags,
    source,
    requestId
  };

  console.log(`🔄 Attempting to invalidate ${tags.length} cache tags:`, tags);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`📡 Cache invalidation attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);
      
      const response = await fetch(CACHE_INVALIDATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-worker-key'}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as CacheInvalidationResponse;
      
      if (result.success) {
        console.log(`✅ Successfully invalidated ${result.invalidated_tags.length} cache tags`);
        if (result.failed_tags.length > 0) {
          console.warn(`⚠️ Failed to invalidate ${result.failed_tags.length} tags:`, result.failed_tags);
        }
        return result;
      } else {
        throw new Error(result.error || 'Cache invalidation failed');
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Cache invalidation attempt ${attempt} failed:`, lastError.message);

      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`⏳ Waiting ${RETRY_DELAY_MS}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // All attempts failed
  console.error(`🚨 All cache invalidation attempts failed. Last error:`, lastError?.message);
  return {
    success: false,
    invalidated_tags: [],
    failed_tags: tags,
    error: lastError?.message || 'All retry attempts exhausted'
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
