'use server';

import type {
  Medication,
  InventoryItem,
  Supplier,
} from '@/types/supabase';
import { createClient } from '@/app/lib/supabase/server';
import { checkUsageLimit } from '@/app/lib/server-utils';
  
// Fetch inventory with optional search
export async function fetchInventory(search?: string): Promise<Medication[]> {
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

   if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can fetch inventory');
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

  
  let query = supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      unit_price,
      description,
      is_active,
      created_at,
      updated_at,
      tenant_id,
      medication_batches (
        id,
        batch_number,
        expiry_date,
        quantity,
        unit_price,
        tenant_id
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');

  if (search) {
    query = query.or(`name.ilike.%${search}%,dosage_form.ilike.%${search}%,strength.ilike.%${search}%`);
  }
const { data, error } = await query;

  if (error) {
    throw error;
  }

  
  const result = (data || []).map(medication => {
    // Filter batches to only include those from the same tenant
    const batches = (medication.medication_batches || []).filter(batch => batch.tenant_id === tenantId);
    const totalStock = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
    
    return {
      ...medication,
      is_active: medication.is_active ?? true,
      created_at: medication.created_at || new Date().toISOString(),
      updated_at: medication.updated_at || new Date().toISOString(),
      batches: batches.map(batch => ({
        id: batch.id,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        quantity: batch.quantity || 0,
        unit_price: batch.unit_price
      })),
      total_stock: totalStock,
      last_restocked_at: null,
      last_sold_at: null
    };
  });


  return result;
}
  
// Add or update inventory item
export async function manageInventory(
  item: InventoryItem
): Promise<{ medication_id: string }> {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can manage inventory');
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

  try {
    // Check inventory usage limit before proceeding
    const { allowed, current, limit } = await checkUsageLimit(tenantId, 'max_inventory_items');
    if (!allowed) {
      throw new Error(`Inventory limit reached. Current usage: ${current}/${limit}`);
    }

    // Validate required fields
    if (!item.name || !item.category || !item.dosage_form || !item.strength || !item.unit_price) {
      throw new Error('Missing required fields');
    }

    let medication_id = item.medication_id;

    // If no medication_id provided, create a new medication
    if (!medication_id) {
      const { data: newMedication, error: medicationError } = await supabase
        .from('medications')
        .insert({
          name: item.name,
          category: item.category,
          dosage_form: item.dosage_form,
          strength: item.strength,
          unit_price: item.unit_price,
          description: item.description,
          is_active: true,
          tenant_id: tenantId
        })
        .select('id')
        .single();

      if (medicationError) {
        console.error('Error creating medication:', medicationError);
        throw new Error(`Failed to create medication: ${medicationError.message}`);
      }
      
      if (!newMedication?.id) {
        throw new Error('Failed to create medication: No ID returned');
      }
      
      medication_id = newMedication.id;
    }

    // If batch information is provided, create a new batch
    if (item.batch_number && item.expiry_date && item.quantity) {
      const { error: batchError } = await supabase
        .from('medication_batches')
        .insert({
          medication_id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tenant_id: tenantId
        });

      if (batchError) {
        console.error('Error creating batch:', batchError);
        throw new Error(`Failed to create batch: ${batchError.message}`);
      }
    }

    return { medication_id };
  } catch (error) {
    console.error('Error in manageInventory:', error);
    throw error;
  }
}
  
// Update medication details
export async function updateMedication(id: string, updateData: Partial<InventoryItem>) {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can update medications');
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
    .from('medications')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update medication: ${error.message}`);
  }

  return data;
}
  
// Delete medication (soft delete)
export async function deleteMedication(id: string) {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can delete medications');
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

  const { error } = await supabase
    .from('medications')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`Failed to delete medication: ${error.message}`);
  }

  return { success: true };
}
  
// Fetch all suppliers
export async function fetchSuppliers(): Promise<Supplier[]> {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can fetch suppliers');
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
    .from('suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching suppliers:', error);
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  return data || [];
}
  
// Add new supplier
export async function addSupplier(formData: FormData): Promise<Supplier> {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can add suppliers');
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

  const name = formData.get('name')?.toString();
  const contact = formData.get('contact')?.toString();
  const phone = formData.get('phone')?.toString();
  const email = formData.get('email')?.toString();
  const address = formData.get('address')?.toString();

  if (!name || !contact || !phone) {
    throw new Error('Missing required fields');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name,
      contact_person: contact,
      phone_number: phone,
      email: email || null,
      address: address || null,
      tenant_id: tenantId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add supplier: ${error.message}`);
  }

  return data;
}

// Add a new function to fetch stock alerts
export async function fetchStockAlerts(): Promise<{
  lowStock: Array<{
    medication: Medication;
    batch: {
      batch_number: string;
      quantity: number;
      expiry_date: string;
    };
  }>;
  expiring: Array<{
    medication: Medication;
    batch: {
      batch_number: string;
      quantity: number;
      expiry_date: string;
    };
  }>;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
      return { lowStock: [], expiring: [] };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    return { lowStock: [], expiring: [] };
  }

  if (!profile.tenant_id) {
    return { lowStock: [], expiring: [] };
  }

  // Set tenant context
  const { error: setContextError } = await supabase
    .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

  if (setContextError) {
   return { lowStock: [], expiring: [] };
  }

  // Get tenant ID from context
  const { data: tenantId, error: getTenantError } = await supabase
    .rpc('get_tenant_id');

  if (getTenantError || !tenantId) {
    console.error('Failed to get tenant ID:', getTenantError);
    return { lowStock: [], expiring: [] };
  }

  const lowStockThreshold = 10; // Configurable threshold
  const expiryThreshold = 90; // Days before expiry to alert

  // Get medications with low stock
  const { data: lowStockData, error: lowStockError } = await supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      unit_price,
      description,
      is_active,
      created_at,
      updated_at,
      medication_batches (
        batch_number,
        expiry_date,
        quantity
      )
    `)
    .eq('is_active', true)
    .eq('tenant_id', tenantId);

  if (lowStockError) {
    console.error('Error fetching low stock:', lowStockError);
    return { lowStock: [], expiring: [] };
  }

  const lowStock = (lowStockData || [])
    .map(medication => {
      const totalStock = medication.medication_batches.reduce((sum, batch) => sum + batch.quantity, 0);
      if (totalStock <= lowStockThreshold) {
        return {
          medication: {
            id: medication.id,
            name: medication.name,
            category: medication.category,
            dosage_form: medication.dosage_form,
            strength: medication.strength,
            unit_price: medication.unit_price,
            description: medication.description,
            is_active: medication.is_active,
            created_at: medication.created_at || new Date().toISOString(),
            updated_at: medication.updated_at || new Date().toISOString(),
            tenant_id: tenantId,
            last_restocked_at: null,
            last_sold_at: null
          },
          batch: {
            batch_number: medication.medication_batches[0]?.batch_number || 'N/A',
            quantity: totalStock,
            expiry_date: medication.medication_batches[0]?.expiry_date || 'N/A'
          }
        };
      }
      return null;
    })
    .filter(item => item !== null) as Array<{
      medication: Medication;
      batch: {
        batch_number: string;
        quantity: number;
        expiry_date: string;
      };
    }>;

  // Get medications with batches nearing expiry
  const { data: expiringData, error: expiringError } = await supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      unit_price,
      description,
      is_active,
      created_at,
      updated_at,
      medication_batches (
        batch_number,
        expiry_date,
        quantity
      )
    `)
    .eq('is_active', true)
    .eq('tenant_id', tenantId);

  if (expiringError) {
    console.error('Error fetching expiring medications:', expiringError);
    return { lowStock, expiring: [] };
  }

  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(now.getDate() + expiryThreshold);

  const expiring = (expiringData || [])
    .flatMap(medication =>
      medication.medication_batches
        .filter(batch => {
          const batchExpiryDate = new Date(batch.expiry_date);
          return batchExpiryDate <= expiryDate && batchExpiryDate > now;
        })
        .map(batch => ({
          medication: {
            id: medication.id,
            name: medication.name,
            category: medication.category,
            dosage_form: medication.dosage_form,
            strength: medication.strength,
            unit_price: medication.unit_price,
            description: medication.description,
            is_active: medication.is_active,
            created_at: medication.created_at || new Date().toISOString(),
            updated_at: medication.updated_at || new Date().toISOString(),
            tenant_id: tenantId,
            last_restocked_at: null,
            last_sold_at: null
          },
          batch: {
            batch_number: batch.batch_number,
            quantity: batch.quantity,
            expiry_date: batch.expiry_date
          }
        }))
    );

  return { lowStock, expiring };
}

export async function fetchBasicMedications(search?: string): Promise<{
  id: string;
  name: string;
  category: string | null;
  dosage_form: string;
  strength: string;
  description: string | null;
}[]> {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can fetch medications');
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

  let query = supabase
    .from('medications')
    .select(`
      id,
      name,
      category,
      dosage_form,
      strength,
      description
    `)
    .eq('is_active', true)
    .eq('tenant_id', tenantId)
    .order('name');

  if (search) {
    query = query.or(`name.ilike.%${search}%,dosage_form.ilike.%${search}%,strength.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching medications:', error);
    throw new Error(`Failed to fetch medications: ${error.message}`);
  }

  return data || [];
}

// Delete a medication batch
export async function deleteBatch(batchId: string) {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can delete batches');
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

  // First verify the batch belongs to the tenant
  const { data: batch, error: batchError } = await supabase
    .from('medication_batches')
    .select('id, medication_id')
    .eq('id', batchId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (batchError) {
    throw new Error(`Failed to verify batch: ${batchError.message}`);
  }

  if (!batch) {
    throw new Error('Batch not found or does not belong to tenant');
  }

  // Delete associated stock movements first
  const { error: stockMovementsError } = await supabase
    .from('stock_movements')
    .delete()
    .eq('batch_id', batchId)
    .eq('tenant_id', tenantId);

  if (stockMovementsError) {
    throw new Error(`Failed to delete associated stock movements: ${stockMovementsError.message}`);
  }

  // Delete the batch
  const { error: deleteError } = await supabase
    .from('medication_batches')
    .delete()
    .eq('id', batchId)
    .eq('tenant_id', tenantId);

  if (deleteError) {
    throw new Error(`Failed to delete batch: ${deleteError.message}`);
  }

  return { success: true };
}

export async function addBatch(batchData: {
  medication_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
}) {
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

  if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
    throw new Error('Unauthorized: Only admins and pharmacists can add batches');
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

  // First verify the medication belongs to the tenant
  const { data: medication, error: medicationError } = await supabase
    .from('medications')
    .select('id')
    .eq('id', batchData.medication_id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (medicationError) {
    throw new Error(`Failed to verify medication: ${medicationError.message}`);
  }

  if (!medication) {
    throw new Error('Medication not found or does not belong to tenant');
  }

  // Add the batch
  const { data, error } = await supabase
    .from('medication_batches')
    .insert({
      ...batchData,
      tenant_id: tenantId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add batch: ${error.message}`);
  }

  return data;
}
