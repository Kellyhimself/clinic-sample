'use server';

import { createClient } from '@/app/lib/supabase/server';
import { Database } from '@/types/supabase';
import { Sale } from './sales';
import { getDateRangeFromTimeframe } from '@/lib/utils/dateUtils';

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
export async function getTopSellingMedications(timeframe?: string): Promise<TopSellingMedication[]> {
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

    // Calculate date range based on timeframe
    const { startDate, endDate } = getDateRangeFromTimeframe(timeframe || 'all');
    
    // Call the database function with tenant_id parameter and date range
    const { data, error } = await supabase
      .rpc('get_top_selling_medications', { 
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate,
        p_end_date: endDate
      });

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
 * Server action to fetch sales with optional filters
 */
export async function fetchSales(
  searchTerm: string = '',
  timeframe: string = 'all',
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: Sale[]; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Get the current user's tenant context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return { data: [], error: 'No tenant context found' };
    }
    
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

    // Apply search term if provided
    if (searchTerm) {
      query = query.or(`
        patient_id.ilike.%${searchTerm}%,
        items.medication.name.ilike.%${searchTerm}%,
        payment_method.ilike.%${searchTerm}%,
        items.batch.batch_number.ilike.%${searchTerm}%
      `);
    }

    // Apply date filtering if timeframe is not 'all'
    if (timeframe !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startDate: Date;
      switch (timeframe) {
        case 'today':
          startDate = today;
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = today;
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      return { data: [], error: 'Failed to fetch sales data' };
    }

    if (!data) return { data: [], error: null };

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

    return { data: salesWithPatients, error: null };
  } catch (error) {
    console.error('Error in fetchSales:', error);
    return { data: [], error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to get medication profit margins
 */
export async function getMedicationProfitMargins(timeframe?: string): Promise<MedicationProfitMargin[]> {
  try {
    const supabase = await createClient();
    
    // Get the current user
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

    // Calculate date range based on timeframe
    const { startDate, endDate } = getDateRangeFromTimeframe(timeframe || 'all');
    
    // Call the RPC function to get profit margins with date range
    const { data, error } = await supabase
      .rpc('get_medication_profit_margins', { 
        p_tenant_id: profile.tenant_id,
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getMedicationProfitMargins:', error);
    throw error;
  }
} 