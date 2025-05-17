'use server';

import { createClient } from '@/app/lib/supabase/server';
import { Database } from '@/types/supabase';
import { createClient as supabaseClient } from '@supabase/supabase-js';

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

type Sale = Database['public']['Tables']['sales']['Row'] & {
  items: SaleItem[];
  patient?: {
    full_name: string;
    phone_number: string | null;
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

// Initialize Supabase client
const supabase = supabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface MedicationProfitMargin {
  medication_id: string;
  medication_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  total_price: number;
  purchase_price: number;
  unit_price: number;
  effective_cost: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  created_at: string;
}

/**
 * Server action to fetch top selling medications
 */
export async function getTopSellingMedications(): Promise<TopSellingMedication[]> {
  try {
    const supabase = await createClient();
    
    // Get the current user's tenant context
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
    
    
    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      throw new Error('Failed to set tenant context');
    }
    // Get tenant ID from context to verify it was set correctly
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
     throw new Error('Failed to get tenant ID');
    }

    if (tenantId !== profile.tenant_id) {
      throw new Error('Tenant context mismatch');
    }
    
    // Call the database function
    const { data, error } = await supabase
      .rpc('get_top_selling_medications');

    if (error) {
      throw new Error('Failed to fetch top selling medications');
    }
    
    
    if (!Array.isArray(data)) {
     throw new Error('Invalid data format received from database');
    }
    
    // Transform the data to match the expected format
   
    const transformedData = data.map(item => {
      if (!item || typeof item !== 'object') {
       throw new Error('Invalid item in medication data');
      }
      
      const { medication_id, medication_name, total_quantity } = item;
      
      if (!medication_id || !medication_name || typeof total_quantity !== 'number') {
       throw new Error('Invalid medication data structure');
      }
      
      return {
        medication_id,
        medication_name,
        total_quantity: Number(total_quantity)
      };
    });
       
    return transformedData;
  } catch (error) {
    
    throw error;
  }
}

/**
 * Server action to calculate profit and reorders data
 */
export async function calculateProfitAndReorders(): Promise<ProfitData[]> {
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
      // For both regular UUIDs and guest patient IDs ('guest_' prefix followed by UUID)
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
            });
          } else {
            // If patient fetch fails, still include the sale but without patient data
            salesWithPatients.push({
              ...sale,
              created_at: sale.created_at || new Date().toISOString(),
              items: sale.items as unknown as SaleItem[],
              patient: undefined
            });
          }
        } catch (err) {
          console.error('Error fetching patient data for sale:', err);
          salesWithPatients.push({
            ...sale,
            created_at: sale.created_at || new Date().toISOString(),
            items: sale.items as unknown as SaleItem[],
            patient: undefined
          });
        }
      } else {
        // No patient ID
        salesWithPatients.push({
          ...sale,
          created_at: sale.created_at || new Date().toISOString(),
          items: sale.items as unknown as SaleItem[],
          patient: undefined
        });
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
    
    // Get the current user's tenant context
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
    

    // Set tenant context
 
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      
      throw new Error('Failed to set tenant context');
    }

    // Get tenant ID from context to verify it was set correctly
    
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
     throw new Error('Failed to get tenant ID');
    }

    if (tenantId !== profile.tenant_id) {
      throw new Error('Tenant context mismatch');
    }
    // Call the RPC function with tenant ID parameter
    const response = await supabase
      .rpc('get_medication_profit_margins', { p_tenant_id: profile.tenant_id });
   
    const { data, error } = response;

    if (error) {
      console.error('Error fetching medication profit margins:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    if (!data) {
      
      return [];
    }
    
 return data;
  } catch (error) {
 
    throw error;
  }
} 