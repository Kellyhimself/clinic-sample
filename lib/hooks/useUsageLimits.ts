import { useEffect, useState } from 'react';
import { useSubscription } from '@/app/lib/hooks/useSubscription';

interface UsageLimit {
  feature: string;
  limit: number;
  used: number;
  remaining: number;
}

export function useUsageLimits() {
  const { subscription } = useSubscription();
  const [limits, setLimits] = useState<Record<string, UsageLimit>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/usage-limits');
        if (!response.ok) {
          throw new Error('Failed to fetch usage limits');
        }
        const data = await response.json();
        setLimits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch usage limits');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLimits();
  }, [subscription?.plan]);

  const checkUsage = async (feature: string): Promise<UsageLimit> => {
    if (limits[feature]) {
      return limits[feature];
    }

    try {
      const response = await fetch(`/api/usage-limits/${feature}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch usage limit for ${feature}`);
      }
      const data = await response.json();
      setLimits(prev => ({ ...prev, [feature]: data }));
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : `Failed to fetch usage limit for ${feature}`);
    }
  };

  return {
    limits,
    isLoading,
    error,
    checkUsage
  };
} 
 