import { useEffect, useState, useCallback } from 'react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';

interface UsageLimit {
  feature: string;
  limit: number;
  used: number;
  remaining: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

interface CacheEntry {
  data: Record<string, UsageLimit>;
  timestamp: number;
}

let limitsCache: CacheEntry | null = null;

export function useUsageLimits() {
  const { subscription } = useSubscription();
  const [limits, setLimits] = useState<Record<string, UsageLimit>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchLimits = useCallback(async (retry = false) => {
    try {
      // Check cache first
      if (limitsCache && Date.now() - limitsCache.timestamp < CACHE_DURATION) {
        setLimits(limitsCache.data);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/usage-limits');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch usage limits: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update cache
      limitsCache = {
        data,
        timestamp: Date.now()
      };
      
      setLimits(data);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch usage limits';
      setError(errorMessage);
      
      // Implement retry logic
      if (retry && retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchLimits(true);
        }, RETRY_DELAY * (retryCount + 1));
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  const checkUsage = useCallback(async (feature: string): Promise<UsageLimit> => {
    // Check cache first
    if (limitsCache && Date.now() - limitsCache.timestamp < CACHE_DURATION) {
      const cachedLimit = limitsCache.data[feature];
      if (cachedLimit) {
        return cachedLimit;
      }
    }

    try {
      const response = await fetch(`/api/usage-limits/${feature}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch usage limit for ${feature}`);
      }
      
      const data = await response.json();
      
      // Update cache
      limitsCache = {
        data: { ...limitsCache?.data, [feature]: data },
        timestamp: Date.now()
      };
      
      setLimits(prev => ({ ...prev, [feature]: data }));
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : `Failed to fetch usage limit for ${feature}`);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [subscription?.plan, fetchLimits]);

  // Clear cache when subscription changes
  useEffect(() => {
    limitsCache = null;
  }, [subscription?.plan]);

  return {
    limits,
    isLoading,
    error,
    retryCount,
    checkUsage,
    refetch: () => fetchLimits(true)
  };
} 
 