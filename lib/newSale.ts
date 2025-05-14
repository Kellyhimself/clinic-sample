'use server';

import { createClient } from '@/app/lib/supabase/server';
import { checkUsageLimit } from '@/app/lib/server-utils';
import type {
  Database, 
  Medication,
  Patient,
} from '@/types/supabase';
import { PostgrestError } from 'supabase';

// Define types from database schema
type GuestPatientRow = Database['public']['Tables']['guest_patients']['Row'];

// Add type definitions for RPC functions
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = any>(
      fn: 'set_tenant_context' | 'get_tenant_id' | 'decrement_batch_quantity' | 'get_patient_by_id',
      params?: Record<string, any>
    ): Promise<{ data: T; error: PostgrestError | null }>;
  }
}

// Add Sale and SaleItem types
type Sale = {
  id: string;
  patient_id?: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items: SaleItem[];
  patient?: {
    full_name: string;
    phone_number: string;
  };
};

type SaleItem = {
  id: string;
  medication_id: string;
  batch_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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

// Add fetchUserRole function
async function fetchUserRole(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role || '';
}

// Fetch medications with batches
export async function fetchMedications(): Promise<Medication[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins, pharmacists and cashiers can fetch medications');
  }

  if (!profile.tenant_id) {
    throw new Error('No tenant ID found for user');
  }

  // Set tenant context
  const { error: setContextError } = await supabase
    .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

  if (setContextError) {
    throw new Error('Failed to set tenant context');
  }

  // Get tenant ID from context
  const { data: tenantId, error: getTenantError } = await supabase
    .rpc('get_tenant_id');

  if (getTenantError || !tenantId) {
    throw new Error('Failed to get tenant ID');
  }
    
  const { data: medications, error: medError } = await supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      description,
      is_active,
      created_at,
      updated_at,
      tenant_id,
      batches:medication_batches (
        id,
        batch_number,
        expiry_date,
        quantity,
        unit_price,
        created_at,
        updated_at,
        medication_id,
        tenant_id
      )
    `)
    .eq('tenant_id', tenantId)
    .is('is_active', true);
  
  if (medError) {
    throw medError;
  }
  
  return (medications || []).map((med) => ({
    ...med,
    is_active: med.is_active ?? true,
    created_at: med.created_at || new Date().toISOString(),
    updated_at: med.updated_at || new Date().toISOString(),
    batches: (med.batches || []).map((batch) => ({
      id: batch.id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: batch.quantity,
      unit_price: batch.unit_price,
      tenant_id: batch.tenant_id,
      supplier_id: undefined // Optional field
    })),
    total_stock: (med.batches || []).reduce((total, batch) => total + (batch.quantity || 0), 0),
    last_restocked_at: null,
    last_sold_at: null
  }));
}

// Fetch all patients
export async function fetchPatients(): Promise<Patient[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins, pharmacists and cashiers can fetch patients');
  }

  if (!profile.tenant_id) {
    throw new Error('No tenant ID found for user');
  }

  // Set tenant context
  const { error: setContextError } = await supabase
    .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

  if (setContextError) {
    throw new Error('Failed to set tenant context');
  }

  // Get tenant ID from context
  const { data: tenantId, error: getTenantError } = await supabase
    .rpc('get_tenant_id');

  if (getTenantError || !tenantId) {
    throw new Error('Failed to get tenant ID');
  }
    
  const { data, error } = await supabase
    .from('guest_patients')
    .select(`
      id,
      full_name,
      phone_number,
      email,
      date_of_birth,
      gender,
      address,
      created_at,
      updated_at,
      tenant_id,
      patient_type
    `)
    .eq('tenant_id', tenantId)
    .order('full_name');
  
  if (error) {
    throw error;
  }

  return (data || []).map((patient: GuestPatientRow) => ({
    id: patient.id,
    full_name: patient.full_name,
    phone_number: patient.phone_number,
    email: patient.email,
    date_of_birth: patient.date_of_birth,
    gender: patient.gender,
    address: patient.address,
    created_at: patient.created_at,
    updated_at: patient.updated_at,
    patient_type: patient.patient_type,
    user_id: null,
    reference_id: null,
    last_access: null,
    notes: null
  }));
}


// Create a new sale
export async function createSale(saleData: {
  patient_id?: string;
  items: Array<{
    medication_id: string;
    batch_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  payment_method: string;
  payment_status: string;
  total_amount: number;
}) {
  console.log('=== createSale START ===');
  console.log('Received sale data:', {
    patientId: saleData.patient_id,
    itemsCount: saleData.items.length,
    paymentMethod: saleData.payment_method,
    totalAmount: saleData.total_amount
  });

  try {
    const supabase = await createClient();
    console.log('Supabase client created');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
      throw new Error('Unauthorized: Only admins, pharmacists and cashiers can create sales');
    }

    if (!profile.tenant_id) {
      throw new Error('No tenant ID found for user');
    }

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

    console.log('Tenant context set successfully:', { tenantId });

    // Check transaction limits
    console.log('Checking transaction limits...');
    const { allowed, current, limit } = await checkUsageLimit(tenantId, 'max_transactions_per_month');
    console.log('Transaction limit check result:', { allowed, current, limit });

    if (!allowed) {
      console.error('Transaction limit reached:', { current, limit });
      throw new Error(`Transaction limit reached (${current}/${limit}). Please upgrade your plan to continue making sales.`);
    }

    // Only validate patient if patient_id is provided
    if (saleData.patient_id) {
      console.log('Validating patient:', saleData.patient_id);
      // Check the guest_patients table directly
      const { data: patientData, error: patientError } = await supabase
        .from('guest_patients')
        .select('id, patient_type')
        .eq('id', saleData.patient_id)
        .eq('tenant_id', tenantId)
        .single();

      console.log('Patient validation result:', {
        hasData: !!patientData,
        error: patientError ? patientError.message : 'none'
      });

      if (patientError) {
        console.error('Error validating patient:', patientError);
        throw new Error('Invalid patient ID or patient not found');
      }

      if (!patientData) {
        console.error('Patient not found:', saleData.patient_id);
        throw new Error('Patient not found');
      }
      }

      // Calculate totals
      const medicationTotal = saleData.items.reduce((sum, item) => sum + item.total_price, 0);
      const appointmentTotal = 0; // Quick sales don't include appointments
      const grandTotal = medicationTotal + appointmentTotal;

      console.log('Creating sale with totals:', {
        medicationTotal,
        appointmentTotal,
        grandTotal,
        patientId: saleData.patient_id
      });

      // Start a transaction
      console.log('Creating sale record...');
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          patient_id: saleData.patient_id,
          payment_method: saleData.payment_method,
          payment_status: saleData.payment_status,
          total_amount: grandTotal,
        created_by: user.id,
        tenant_id: tenantId
        })
        .select()
        .single();

      console.log('Sale creation result:', {
        hasData: !!sale,
        error: saleError ? saleError.message : 'none'
      });

      if (saleError) {
        console.error('Error creating sale:', saleError);
        throw saleError;
      }

      // Insert sale items and decrement batch quantities
      console.log('Processing sale items...');
      for (const item of saleData.items) {
        console.log('Processing item:', {
          medicationId: item.medication_id,
          batchId: item.batch_id,
          quantity: item.quantity
        });

        // Insert sale item with explicit tenant_id
        const { error: itemError } = await supabase
          .from('sale_items')
          .insert({
            sale_id: sale.id,
            medication_id: item.medication_id,
            batch_id: item.batch_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          tenant_id: tenantId
          });

        if (itemError) {
          console.error('Error inserting sale item:', itemError);
          // Attempt to rollback the sale creation
          await supabase.from('sales').delete().eq('id', sale.id);
          throw itemError;
        }

        // Decrement batch quantity
        console.log('Decrementing batch quantity...');
        const { error: decrementError } = await supabase.rpc('decrement_batch_quantity', {
          p_batch_id: item.batch_id,
          p_quantity: item.quantity
        });

        if (decrementError) {
          console.error('Error decrementing batch quantity:', decrementError);
          // Attempt to rollback the sale creation and items
          await supabase.from('sale_items').delete().eq('sale_id', sale.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          throw decrementError;
        }
      }

    console.log('Sale completed successfully:', { saleId: sale.id });
    return { success: true, data: sale };

  } catch (error) {
    console.error('Error in createSale:', error);
    throw error;
  }
}

// Update sale status
export async function updateSaleStatus(id: string, updateData: {
  payment_status?: string;
  payment_method?: string;
}): Promise<Sale> {
  const supabase = await createClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can update sales');
  }

  const { data, error } = await supabase
    .from('sales')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      items:sale_items(
        id,
        medication_id,
        batch_id,
        sale_id,
        quantity,
        unit_price,
        total_price,
        created_at,
        medication:medications(id, name, dosage_form, strength),
        batch:medication_batches(batch_number, expiry_date)
      )
    `)
    .single();

  if (error) {
    throw new Error(`Failed to update sale: ${error.message}`);
  }

  // Fetch patient data separately for both regular and guest patients
  let patientInfo = undefined;
  
  if (data.patient_id) {
    try {
      // Use RPC for both regular and guest patients
      const { data: patientData, error: patientError } = await supabase
        .rpc('get_patient_by_id', { p_id: data.patient_id });
      
      if (!patientError && patientData) {
        patientInfo = {
          full_name: patientData.full_name,
          phone_number: patientData.phone_number
        };
      }
    } catch (err) {
      console.error('Error fetching patient data:', err);
    }
  }

  // Create a properly typed Sale object with the patient information
  const result = {
    ...data,
    created_at: data.created_at || new Date().toISOString(),
    items: data.items as unknown as SaleItem[],
    patient: patientInfo
  };

  return result as Sale;
}