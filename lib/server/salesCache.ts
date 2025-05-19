'use server';

interface CacheConfig<T> {
  key: string;
  duration: number;
  data: T;
  timestamp: number;
}

// In-memory cache store - module level variable, not exported
const cache = new Map<string, CacheConfig<unknown>>();
const DEFAULT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function setCache<T>(
  key: string, 
  data: T, 
  duration: number = DEFAULT_DURATION
): Promise<void> {
  try {
    cache.set(key, {
      key,
      duration,
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error setting cache:', error);
    throw new Error('Failed to set cache');
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.duration) {
      cache.delete(key);
      return null;
    }
    
    return item.data as T;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
    throw new Error('Failed to invalidate cache');
  }
}

export async function invalidateCacheByTenant(tenantId: string): Promise<void> {
  await invalidateCache(`tenant-${tenantId}`);
}

export async function invalidateCacheBySale(saleId: string): Promise<void> {
  await invalidateCache(`sale-${saleId}`);
}

export async function clearCache(): Promise<void> {
  try {
    cache.clear();
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw new Error('Failed to clear cache');
  }
} 