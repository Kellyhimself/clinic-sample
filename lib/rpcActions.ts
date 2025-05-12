'use server';

import { createClient } from '@/app/lib/supabase/server';
import { Database } from '@/types/supabase';

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

/**
 * Server action to fetch top selling medications
 */
export async function getTopSellingMedications(): Promise<TopSellingMedication[]> {
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
    
    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      console.error('Error setting tenant context:', setContextError);
      throw new Error('Failed to set tenant context');
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
      console.error('Failed to get tenant ID:', getTenantError);
      throw new Error('Failed to get tenant ID');
    }
    
    // Custom query with tenant context
    const { data, error } = await supabase
      .from('sale_items')
      .select(`
        id,
        medication_id,
        quantity,
        medication:medications (
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('quantity', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error fetching top selling medications:', error);
      throw new Error('Failed to fetch top selling medications');
    }
    
    // Transform the data to match the expected format
    const transformedData = (data as SaleItem[]).map(item => ({
      medication_id: item.medication_id,
      medication_name: item.medication.name,
      total_quantity: item.quantity
    }));
    
    return transformedData || [];
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
    
    // Get the current user's tenant context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) throw new Error('No tenant context found');
    
    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      console.error('Error setting tenant context:', setContextError);
      throw new Error('Failed to set tenant context');
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
      console.error('Failed to get tenant ID:', getTenantError);
      throw new Error('Failed to get tenant ID');
    }
    
    // First, get all medications for the tenant
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select(`
        id,
        name,
        unit_price,
        category,
        dosage_form,
        strength
      `)
      .eq('tenant_id', tenantId);
      
    if (medicationsError) {
      console.error('Error fetching medications:', medicationsError);
      throw new Error('Failed to fetch medications');
    }
    
    // Then, get all sale items to calculate sales
    const { data: saleItems, error: saleItemsError } = await supabase
      .from('sale_items')
      .select(`
        id,
        medication_id,
        quantity,
        unit_price,
        total_price
      `)
      .eq('tenant_id', tenantId);
      
    if (saleItemsError) {
      console.error('Error fetching sale items:', saleItemsError);
      throw new Error('Failed to fetch sale items');
    }
    
    // Calculate profits and reorder status for each medication
    const profitData = medications.map(medication => {
      // Get all sale items for this medication
      const medicationSales = saleItems.filter(item => 
        item.medication_id === medication.id
      );
      
      // Calculate totals
      const totalSales = medicationSales.reduce((sum, item) => 
        sum + item.total_price, 0);
      
      const totalCost = medicationSales.reduce((sum, item) => 
        sum + (item.quantity * medication.unit_price), 0);
      
      // Calculate profit margin
      let profitMargin = 0;
      if (totalCost > 0) {
        profitMargin = ((totalSales - totalCost) / totalCost) * 100;
      }
      
      return {
        medication_id: medication.id,
        name: medication.name,
        total_sales: totalSales,
        total_cost: totalCost,
        profit_margin: profitMargin,
        reorder_suggested: false // This would need to be calculated based on stock levels
      };
    });
    
    return profitData;
  } catch (error) {
    console.error('Error in calculateProfitAndReorders:', error);
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