# Sales System Technical Implementation Guide

## Data Management Implementation

### 1. Server Action Optimization

#### Modify `lib/sales.ts`:
```typescript
'use server';

import { createClient } from '@/app/lib/supabase/server';
import { getCache, setCache } from '@/lib/server/salesCache';

export interface PaginatedSalesResponse {
  data: Sale[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

export async function fetchSales(
  searchTerm: string,
  timeframe: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: PaginatedSalesResponse; error: string | null }> {
  try {
    const cacheKey = `sales-${searchTerm}-${timeframe}-${page}-${pageSize}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) return { data: cachedData, error: null };

    const supabase = await createClient();
    // ... existing tenant context and validation logic ...

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        created_at,
        payment_method,
        payment_status,
        total_amount,
        transaction_id,
        created_by,
        tenant_id,
        patient_id,
        updated_at,
        patient:guest_patients (
          id,
          full_name,
          phone_number
        ),
        items:sale_items (
          id,
          quantity,
          unit_price,
          total_price,
          medication:medications (
            id,
            name,
            dosage_form,
            strength
          ),
          batch:medication_batches (
            batch_number,
            expiry_date
          )
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    const response = {
      data,
      pagination: {
        page,
        pageSize,
        total: data.length,
        hasMore: data.length === pageSize
      }
    };

    await setCache(cacheKey, response);
    return { data: response, error: null };
  } catch (error) {
    console.error('Error in fetchSales:', error);
    return { data: null, error: 'Failed to fetch sales' };
  }
}
```

### 2. Server-Side Caching Implementation

#### Create `lib/salesCache.ts`:
```typescript
'use server';

import { Sale } from './sales';

interface CacheConfig<T> {
  key: string;
  duration: number;
  data: T;
  timestamp: number;
}

class SalesCache {
  private static instance: SalesCache;
  private cache: Map<string, CacheConfig<unknown>>;

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): SalesCache {
    if (!SalesCache.instance) {
      SalesCache.instance = new SalesCache();
    }
    return SalesCache.instance;
  }

  async set<T>(key: string, data: T, duration: number = 300000) {
    this.cache.set(key, {
      key,
      duration,
      data,
      timestamp: Date.now()
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.duration) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  async invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async invalidateByTenant(tenantId: string) {
    await this.invalidate(`tenant-${tenantId}`);
  }

  async invalidateBySale(saleId: string) {
    await this.invalidate(`sale-${saleId}`);
  }
}

export const salesCache = SalesCache.getInstance();
```

### 3. RPC Function Optimization

#### Modify `lib/rpcActions.ts`:
```typescript
'use server';

import { createClient } from '@/app/lib/supabase/server';
import { salesCache } from '@/lib/salesCache';

export async function calculateSalesMetrics(sales: Sale[]): Promise<SalesMetrics> {
  try {
    const cacheKey = `metrics-${sales.length}`;
    const cachedMetrics = await salesCache.get(cacheKey);
    if (cachedMetrics) return cachedMetrics;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('calculate_sales_metrics', {
      p_sales: sales
    });

    if (error) throw error;

    await salesCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error in calculateSalesMetrics:', error);
    throw error;
  }
}
```

## State Management Implementation

### 1. Server-Side State Management

#### Create `lib/salesState.ts`:
```typescript
'use server';

import { createClient } from '@/app/lib/supabase/server';
import { salesCache } from '@/lib/salesCache';

export interface SalesState {
  data: Sale[];
  filtered: Sale[];
  pagination: PaginationParams;
  filters: {
    searchTerm: string;
    timeframe: string;
    status: string;
  };
  loading: boolean;
  error: string | null;
}

export async function updateSalesState(
  action: SalesAction,
  currentState: SalesState
): Promise<SalesState> {
  const supabase = await createClient();
  
  switch (action.type) {
    case 'SET_DATA':
      const filtered = await filterSales(action.payload, currentState.filters);
      return {
        ...currentState,
        data: action.payload,
        filtered
      };
    // ... other cases
  }
}
```

## Implementation Steps

1. **Data Management**
   - Modify server actions
   - Add caching mechanism
   - Set up progressive loading
   - Test data flow

2. **State Management**
   - Enhance server actions
   - Update components
   - Test state changes

3. **Calculations**
   - Optimize RPC functions
   - Implement caching
   - Add progress tracking
   - Test performance

## Testing Strategy

1. **Unit Tests**
   - Test server actions
   - Test caching mechanism
   - Test state management
   - Test calculations

2. **Integration Tests**
   - Test data flow
   - Test RPC functions
   - Test error handling
   - Test performance

3. **Performance Tests**
   - Test load times
   - Test memory usage
   - Test calculation speed
   - Test mobile performance

## Monitoring and Maintenance

1. **Regular Maintenance**
   - Clean up cache
   - Update dependencies
   - Optimize calculations
   - Review performance metrics 