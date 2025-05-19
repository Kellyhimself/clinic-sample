'use server';

import { createClient } from '@/app/lib/supabase/server';
import { Database } from '@/types/supabase';
import { getCache, setCache } from './server/salesCache';

export interface TopSellingMedication {
  medication_id: string;  // UUID from database
  medication_name: string;  // Text from database
  total_quantity: number;  // BigInt from database, converted to number
}

export type Sale = Database['public']['Tables']['sales']['Row'] & {
  patient?: {
    full_name: string;
    phone_number: string | null;
  };
  items: Array<{
    id: string;
    batch_id: string;
    medication_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    sale_id: string;
    created_at: string | null;
    medication: {
      id: string;
      name: string;
      dosage_form: string;
      strength: string;
    };
    batch: {
      batch_number: string;
      expiry_date: string;
    };
  }>;
};

export interface SalesMetrics {
  totalRevenue: number;
  totalSales: number;
  averageSaleAmount: number;
  topSellingMedications: Array<{
    medicationId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesByPaymentMethod: Record<string, number>;
  salesByTimeframe: Record<string, number>;
}

export async function fetchTopSellingMedications(): Promise<TopSellingMedication[]> {
  console.log('=== fetchTopSellingMedications START ===');
  
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user found');
      throw new Error('Not authenticated');
    }
    
    // Get the tenant context
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
      
    if (!profile?.tenant_id) {
      console.log('No tenant found for user');
      throw new Error('No tenant context found');
    }
    
    console.log('Tenant context:', profile.tenant_id);
    
    // Fetch top selling medications with tenant context
    const { data, error } = await supabase
      .from('sale_items')
      .select(`
        medication_id,
        medications (
          id,
          name
        ),
        quantity
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('quantity', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error fetching top selling medications:', error);
      throw error;
    }
    
    // Transform the data to match the TopSellingMedication interface
    const topSelling = data.map(item => ({
      medication_id: item.medication_id,
      medication_name: item.medications?.name || 'Unknown',
      total_quantity: item.quantity
    }));
    
    console.log('=== fetchTopSellingMedications END ===');
    return topSelling;
    
  } catch (error) {
    console.error('Error in fetchTopSellingMedications:', error);
    throw error;
  }
}

export async function fetchSales(
  searchTerm: string = '',
  timeframe: string = 'all',
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: Sale[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
   
    if (!user) {
      console.error('No authenticated user found');
      return { data: [], error: 'Not authenticated' };
    }

    // Get profile and tenant info in a single query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tenant_id, tenants!inner(id)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error('Error fetching profile:', profileError);
      return { data: [], error: 'Failed to fetch user profile or tenant' };
    }

    if (!['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
      console.error('Unauthorized role:', profile.role);
      return { data: [], error: 'Unauthorized: Only admins, pharmacists and cashiers can fetch sales' };
    }

    // Set tenant context with retry
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const { error: setContextError } = await supabase
          .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

        if (!setContextError) {
          // Verify tenant context was set correctly
          const { data: tenantId, error: getTenantError } = await supabase
            .rpc('get_tenant_id');

          if (!getTenantError && tenantId === profile.tenant_id) {
            break; // Successfully set and verified tenant context
          }
        }
        
        lastError = setContextError;
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      } catch (err) {
        lastError = err;
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    if (retries === 0) {
      console.error('Failed to set tenant context after retries:', lastError);
      return { data: [], error: 'Failed to set tenant context' };
    }

    // Calculate date range based on timeframe
    let startDate = null;
    let endDate = null;

    if (timeframe !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (timeframe) {
        case 'today':
          startDate = today.toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'year':
          startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
      }
    }

    // Build the query with left joins
    let query = supabase
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
      .order('created_at', { ascending: false });

    // Apply date filtering if timeframe is not 'all'
    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lt('created_at', endDate);
    }

    // Apply search term if provided
    if (searchTerm) {
      query = query.or(`
        patient.full_name.ilike.%${searchTerm}%,
        items.medication.name.ilike.%${searchTerm}%,
        payment_method.ilike.%${searchTerm}%,
        items.batch.batch_number.ilike.%${searchTerm}%
      `);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching sales:', queryError);
      return { data: [], error: 'Failed to fetch sales data' };
    }

    // Transform the data to match the Sale type
    const transformedData: Sale[] = (data || []).map(sale => ({
      ...sale,
      patient: sale.patient ? {
        full_name: sale.patient.full_name,
        phone_number: sale.patient.phone_number
      } : undefined,
      items: sale.items.map(item => ({
        ...item,
        medication: {
          id: item.medication.id,
          name: item.medication.name,
          dosage_form: item.medication.dosage_form,
          strength: item.medication.strength
        },
        batch: {
          batch_number: item.batch.batch_number,
          expiry_date: item.batch.expiry_date
        }
      }))
    }));

    // Generate cache key with tenant ID
    const cacheKey = `sales-${profile.tenant_id}-${searchTerm}-${timeframe}-${page}-${pageSize}`;
    await setCache(cacheKey, transformedData);
    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchSales:', error);
    return { data: [], error: 'An unexpected error occurred' };
  }
}

export async function getTopSellingMedications(): Promise<TopSellingMedication[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('No tenant context found');
    }

    // Generate cache key with tenant ID
    const cacheKey = `top-selling-medications-${profile.tenant_id}`;
    const cachedData = await getCache<TopSellingMedication[]>(cacheKey);
    if (cachedData) return cachedData;

    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      throw new Error('Failed to set tenant context');
    }

    const { data, error } = await supabase
      .rpc('get_simple_top_selling_medications');

    if (error) {
      throw error;
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from database');
    }
    
    const transformedData = data.map(item => ({
      medication_id: item.medication_id,
      medication_name: item.medication_name,
      total_quantity: Number(item.total_quantity)
    }));
    
    await setCache(cacheKey, transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error in getTopSellingMedications:', error);
    throw error;
  }
}

export async function calculateSalesMetrics(
  sales: Sale[],
  timeframe: string = 'all'
): Promise<SalesMetrics> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('No tenant context found');
    }

    // Generate cache key with tenant ID
    const cacheKey = `metrics-${profile.tenant_id}-${sales.length}-${timeframe}`;
    const cachedMetrics = await getCache<SalesMetrics>(cacheKey);
    if (cachedMetrics) return cachedMetrics;

    const { data, error } = await supabase.rpc('get_sales_metrics', {
      p_sales: sales,
      p_timeframe: timeframe
    });

    if (error) {
      throw error;
    }

    const metrics: SalesMetrics = {
      totalRevenue: data.total_revenue || 0,
      totalSales: data.total_sales || 0,
      averageSaleAmount: data.average_sale_amount || 0,
      topSellingMedications: data.top_selling_medications || [],
      salesByPaymentMethod: data.sales_by_payment_method || {},
      salesByTimeframe: data.sales_by_timeframe || {}
    };

    await setCache(cacheKey, metrics);
    return metrics;
  } catch (error) {
    console.error('Error in calculateSalesMetrics:', error);
    throw error;
  }
}