'use server';

interface CacheConfig<T> {
  key: string;
  duration: number;
  data: T;
  timestamp: number;
  tenantId: string;
}

// In-memory cache store - module level variable, not exported
const cache = new Map<string, CacheConfig<unknown>>();
const DEFAULT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function setCache<T>(
  key: string, 
  data: T, 
  duration: number = DEFAULT_DURATION,
  tenantId?: string
): Promise<void> {
  try {
    // Extract tenant ID from key if not provided
    const extractedTenantId = tenantId || key.split('-')[1];
    if (!extractedTenantId) {
      console.warn('Cache key does not contain tenant ID:', key);
    }

    cache.set(key, {
      key,
      duration,
      data,
      timestamp: Date.now(),
      tenantId: extractedTenantId
    });
  } catch (error) {
    console.error('Error setting cache:', error);
    throw new Error('Failed to set cache');
  }
}

export async function getCache<T>(key: string, tenantId?: string): Promise<T | null> {
  try {
    const item = cache.get(key);
    if (!item) return null;
    
    // Verify tenant ID matches if provided
    if (tenantId && item.tenantId !== tenantId) {
      console.warn('Cache key tenant mismatch:', { key, expected: tenantId, actual: item.tenantId });
      cache.delete(key);
      return null;
    }
    
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
    for (const [key, item] of cache.entries()) {
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
  try {
    for (const [key, item] of cache.entries()) {
      if (item.tenantId === tenantId) {
        cache.delete(key);
      }
    }
  } catch (error) {
    console.error('Error invalidating tenant cache:', error);
    throw new Error('Failed to invalidate tenant cache');
  }
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