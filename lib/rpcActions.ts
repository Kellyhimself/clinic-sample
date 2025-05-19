'use server';

import { createClient } from '@/app/lib/supabase/server';
import { Database } from '@/types/supabase';
import { getCache, setCache } from './server/salesCache';
import { Sale } from './sales';

type SaleItem = Database['public']['Tables']['sale_items']['Row'] & {
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
};

type TopSellingMedication = {
  medication_id: string;
  medication_name: string;
  total_quantity: number;
};

type ProfitData = {
  medication_id: string;
  name: string;
  total_sales: number;
  total_cost: number;
  profit_margin: number;
  reorder_suggested: boolean;
};

export interface MedicationProfitMargin {
  medication_id: string;
  medication_name: string;
  batch_id: string;
  total_price: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  quantity: number;
}

/**
 * Server action to fetch top selling medications
 */
export async function getTopSellingMedications(): Promise<TopSellingMedication[]> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found');
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
    
    // Call the database function with tenant_id parameter
    const { data, error } = await supabase
      .rpc('get_top_selling_medications', { p_tenant_id: profile.tenant_id });

    if (error) {
      throw error;
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format received from database');
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(item => ({
      medication_id: item.medication_id,
      medication_name: item.medication_name,
      total_quantity: Number(item.total_quantity)
    }));
    
    return transformedData;
  } catch (error) {
    console.error('Error in getTopSellingMedications:', error);
    throw error;
  }
}

/**
 * Server action to calculate profit and reorders data
 */
export async function calculateProfitAndReorders(): Promise<ProfitData[]> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) throw new Error('No tenant context found');
    
    // Call the RPC function to get profit data
    const { data: profitData, error: rpcError } = await supabase
      .rpc('calculate_profit_and_reorders', { p_tenant_id: profile.tenant_id });

    if (rpcError) {
      throw new Error('Failed to calculate profit and reorders');
    }
    
    return profitData;
  } catch (error) {
    throw error;
  }
}

/**
 * Server action to fetch sales with optional filters
 */
export async function fetchSales(patientId?: string): Promise<Sale[]> {
  try {
    const supabase = await createClient();
    
    // Get the current user's tenant context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) throw new Error('No tenant context found');
    
    let query = supabase
      .from('sales')
      .select(`
        id,
        created_at,
        created_by,
        patient_id,
        payment_method,
        payment_status,
        total_amount,
        transaction_id,
        updated_at,
        tenant_id,
        items:sale_items (
          id,
          quantity,
          unit_price,
          total_price,
          medication_id,
          batch_id,
          sale_id,
          created_at,
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

    // If patientId is provided, validate it's a valid UUID
    if (patientId) {
      const uuidRegex = /^(guest_)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(patientId)) {
        console.error('Invalid patient ID format:', patientId);
        throw new Error('Invalid patient ID format');
      }
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }

    if (!data) return [];

    // For each sale, fetch the patient information using get_patient_by_id
    const salesWithPatients: Sale[] = [];
    
    for (const sale of data) {
      if (sale.patient_id) {
        try {
          // Fetch patient data using RPC function
          const { data: patientData, error: patientError } = await supabase
            .rpc('get_patient_by_id', { p_id: sale.patient_id });
            
          if (!patientError && patientData) {
            salesWithPatients.push({
              ...sale,
              created_at: sale.created_at || new Date().toISOString(),
              items: sale.items as unknown as SaleItem[],
              patient: {
                full_name: patientData.full_name,
                phone_number: patientData.phone_number
              }
            } as Sale);
          } else {
            // If patient fetch fails, still include the sale but without patient data
            salesWithPatients.push({
              ...sale,
              created_at: sale.created_at || new Date().toISOString(),
              items: sale.items as unknown as SaleItem[],
              patient: undefined
            } as Sale);
          }
        } catch (err) {
          console.error('Error fetching patient data for sale:', err);
          salesWithPatients.push({
            ...sale,
            created_at: sale.created_at || new Date().toISOString(),
            items: sale.items as unknown as SaleItem[],
            patient: undefined
          } as Sale);
        }
      } else {
        // No patient ID
        salesWithPatients.push({
          ...sale,
          created_at: sale.created_at || new Date().toISOString(),
          items: sale.items as unknown as SaleItem[],
          patient: undefined
        } as Sale);
      }
    }

    return salesWithPatients;
  } catch (error) {
    console.error('Error in fetchSales:', error);
    throw error;
  }
}

export async function getMedicationProfitMargins(): Promise<MedicationProfitMargin[]> {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Get the tenant context
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
      
    if (!profile?.tenant_id) {
      throw new Error('No tenant context found');
    }
    
    // Call the RPC function with tenant context
    const { data, error } = await supabase.rpc('get_medication_profit_margins', {
      p_tenant_id: profile.tenant_id
    });
    
    if (error) {
      console.error('Error calculating profit margins:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getMedicationProfitMargins:', error);
    throw error;
  }
}

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

export async function calculateSalesMetrics(
  sales: Sale[],
  timeframe: string = 'all'
): Promise<SalesMetrics> {
  try {
    const cacheKey = `metrics-${sales.length}-${timeframe}`;
    const cachedMetrics = await getCache<SalesMetrics>(cacheKey);
    if (cachedMetrics) {
      return cachedMetrics;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_sales_metrics', {
      p_sales: sales,
      p_timeframe: timeframe
    });

    if (error) {
      console.error('Error calculating sales metrics:', error);
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

    // Cache the results for 5 minutes
    await setCache(cacheKey, metrics);

    return metrics;
  } catch (error) {
    console.error('Error in calculateSalesMetrics:', error);
    throw error;
  }
} 