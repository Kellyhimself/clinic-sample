import { createClient } from '@/app/lib/supabase/client';
import { Database } from '@/types/supabase';

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

export async function fetchTopSellingMedications(): Promise<TopSellingMedication[]> {
  console.log('=== fetchTopSellingMedications START ===');
  const supabase = createClient();
  
  console.log('Getting user...');
  const { data: { user } } = await supabase.auth.getUser();
 
  if (!user) {
    console.log('No user found');
    throw new Error('Not authenticated');
  }
  console.log('User found:', user.id);

  console.log('Getting profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    console.log('Unauthorized role:', profile?.role);
    throw new Error('Unauthorized: Only admins and pharmacists can fetch sales data');
  }

  if (!profile.tenant_id) {
    console.log('No tenant ID in profile');
    throw new Error('No tenant ID found for user');
  }
  console.log('Profile found with tenant_id:', profile.tenant_id);

  // Verify tenant exists
  console.log('Verifying tenant exists...');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', profile.tenant_id)
    .single();

  if (tenantError) {
    console.error('Error verifying tenant:', tenantError);
    throw new Error('Failed to verify tenant');
  }

  if (!tenant) {
    console.error('Tenant not found:', profile.tenant_id);
    throw new Error('Tenant not found');
  }
  console.log('Tenant verified:', tenant.id);

  // Use the new RPC function
  console.log('Querying top selling medications...');
  const { data: topSellingMeds, error: rpcError } = await supabase
    .rpc('get_top_selling_medications', {
      p_tenant_id: profile.tenant_id
    });

  if (rpcError) {
    console.error('Error querying top selling medications:', rpcError);
    throw rpcError;
  }

  console.log('Top selling medications found:', topSellingMeds?.length || 0);
  console.log('Raw data:', topSellingMeds);

  if (!topSellingMeds || topSellingMeds.length === 0) {
    console.log('No top selling medications found for tenant');
    return [];
  }

  // The data from the RPC function already matches our interface exactly
  return topSellingMeds as TopSellingMedication[];
} 


export async function fetchSales(
  searchTerm: string = '',
  timeframe: string = 'all',
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: Sale[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
   
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

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Unexpected error in fetchSales:', error);
    return { data: [], error: 'An unexpected error occurred' };
  }
}