import { useState, useEffect, useCallback } from 'react';

interface StatsFetchOptions {
  startDate?: string;
  endDate?: string;
  forceRefresh?: boolean;
}

/**
 * Custom hook to fetch stats with client-side caching
 */
export function useStats<T = any>(endpoint: string, options: StatsFetchOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  
  // Generate a cache key based on endpoint and date range
  const getCacheKey = useCallback(() => {
    const baseKey = `stats_cache_${endpoint}`;
    if (options.startDate && options.endDate) {
      return `${baseKey}_${options.startDate}_${options.endDate}`;
    }
    return baseKey;
  }, [endpoint, options.startDate, options.endDate]);
  
  // Fetch data from API
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const cacheKey = getCacheKey();
      
      // Check if we have cached data and it's not stale (less than 5 minutes old)
      // and we're not forcing a refresh
      if (!forceRefresh) {
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          const { data: storedData, timestamp } = JSON.parse(cachedData);
          const now = Date.now();
          
          // Use cached data if it's less than 5 minutes old
          if (now - timestamp < 5 * 60 * 1000) {
            setData(storedData);
            setLastFetched(timestamp);
            setLoading(false);
            return;
          }
        }
      }
      
      // Determine which API endpoint to call and with what payload
      let url = `/api/${endpoint}`;
      let method = 'GET';
      let payload: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // If we have date range options, use POST for stats endpoint
      if (endpoint === 'stats' && options.startDate && options.endDate) {
        payload.method = 'POST';
        payload.body = JSON.stringify({
          startDate: options.startDate,
          endDate: options.endDate
        });
      }
      
      // Fetch data from API
      const response = await fetch(url, payload);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint} data: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Store data and whether it came from server cache
      const resultData = responseData.data;
      setData(resultData);
      
      // Cache the data in localStorage
      const now = Date.now();
      localStorage.setItem(cacheKey, JSON.stringify({
        data: resultData,
        timestamp: now,
        fromServerCache: responseData.fromCache || false
      }));
      
      setLastFetched(now);
    } catch (err) {
      console.error(`Error fetching ${endpoint} data:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [endpoint, options.startDate, options.endDate, getCacheKey]);
  
  // Fetch data on mount or when dependencies change
  useEffect(() => {
    fetchData(options.forceRefresh);
  }, [fetchData, options.forceRefresh]);
  
  return {
    data,
    loading,
    error,
    lastFetched,
    refetch: (forceRefresh: boolean = true) => fetchData(forceRefresh)
  };
} 