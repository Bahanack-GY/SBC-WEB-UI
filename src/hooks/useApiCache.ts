import { useState, useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  loading: boolean;
}

interface ApiCacheOptions {
  cacheTime?: number; // Cache duration in milliseconds
  staleTime?: number; // Time before data is considered stale
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  get<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      loading: false
    });
  }

  setLoading(key: string): void {
    const existing = this.cache.get(key);
    this.cache.set(key, {
      data: existing?.data,
      timestamp: existing?.timestamp || Date.now(),
      loading: true
    });
  }

  isStale(key: string, staleTime: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > staleTime;
  }

  hasPendingRequest(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  getPendingRequest(key: string): Promise<any> | undefined {
    return this.pendingRequests.get(key);
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }
}

const globalCache = new ApiCache();

// src/utils/apiCache.ts (New file, or add to src/hooks/useApiCache.ts)
// This is a conceptual global cache store for useApiCache
const globalApiCache = new Map<string, { data: any, timestamp: number }>();

export const invalidateApiCache = (key?: string | string[]) => {
  if (key) {
    if (Array.isArray(key)) {
      key.forEach(k => globalApiCache.delete(k));
    } else {
      globalApiCache.delete(key);
    }
  } else {
    globalApiCache.clear(); // Clears all entries if no key is provided
  }
};

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: ApiCacheOptions = {}
) {
  const { cacheTime = 5 * 60 * 1000, staleTime = 30 * 1000 } = options; // 5 min cache, 30s stale

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = async (force = false) => {
    if (!mountedRef.current) return;

    // Check cache first
    const cached = globalCache.get<T>(key);
    if (!force && cached && !globalCache.isStale(key, staleTime)) {
      setData(cached.data);
      setLoading(cached.loading);
      return cached.data;
    }

    // Check if there's already a pending request
    if (globalCache.hasPendingRequest(key)) {
      const pendingRequest = globalCache.getPendingRequest(key);
      if (pendingRequest) {
        try {
          const result = await pendingRequest;
          if (mountedRef.current) {
            setData(result);
            setLoading(false);
          }
          return result;
        } catch (err) {
          if (mountedRef.current) {
            setError(err instanceof Error ? err.message : 'Request failed');
            setLoading(false);
          }
          throw err;
        }
      }
    }

    // Set loading state
    if (mountedRef.current) {
      setLoading(true);
      setError('');
    }
    globalCache.setLoading(key);

    // Create new request
    const requestPromise = fetcher();
    globalCache.setPendingRequest(key, requestPromise);

    try {
      const result = await requestPromise;

      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        globalCache.set(key, result);
      }

      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Request failed');
        setLoading(false);
      }
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, [key]);

  const refetch = () => fetchData(true);
  const clearCache = () => globalCache.delete(key);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
}

export { globalCache };
