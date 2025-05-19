'use server';

import { createClient } from '@/app/lib/supabase/server';
import { getCache, setCache } from './salesCache';
import { Sale } from '../sales';

export async function fetchCachedSales(
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

    // Generate cache key based on all parameters
    const cacheKey = `sales-${profile.tenant_id}-${searchTerm}-${timeframe}-${page}-${pageSize}`;
    const cachedData = await getCache<Sale[]>(cacheKey);
    if (cachedData) {
      console.log('Cache hit for sales data');
      return { data: cachedData, error: null };
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

    // Cache the transformed results
    if (transformedData.length > 0) {
      await setCache(cacheKey, transformedData);
    }

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchCachedSales:', error);
    return { data: [], error: 'An unexpected error occurred' };
  }
} 