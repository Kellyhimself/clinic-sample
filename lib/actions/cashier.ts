'use server';

import { createClient } from '@/app/lib/supabase/server';
import { fetchUnpaidItems } from '@/lib/cashier';

export async function getUnpaidItems(patientId: string) {
  try {
    const supabase = await createClient();
    
    // Get user and profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'cashier'].includes(profile.role)) {
      throw new Error('Unauthorized');
    }

    if (!profile.tenant_id) {
      throw new Error('No tenant ID found');
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', {
      p_tenant_id: profile.tenant_id
    });

    const unpaidItems = await fetchUnpaidItems(patientId);
    return { success: true, data: unpaidItems };
  } catch (error) {
    console.error('Error in getUnpaidItems:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch unpaid items' 
    };
  }
}

export async function getUnpaidItemsForPatient(patientId: string) {
  'use server';
  
  console.log('=== getUnpaidItemsForPatient START ===');
  
  try {
    const supabase = await createClient();
    
    // Get user and profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'cashier'].includes(profile.role)) {
      throw new Error('Unauthorized');
    }

    if (!profile.tenant_id) {
      throw new Error('No tenant ID found');
    }

    // Set tenant context
    await supabase.rpc('set_tenant_context', {
      p_tenant_id: profile.tenant_id
    });

    // Fetch unpaid appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('patient_id', patientId)
      .eq('payment_status', 'unpaid')
      .eq('tenant_id', profile.tenant_id);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      throw appointmentsError;
    }

    console.log('Found', appointments?.length || 0, 'unpaid appointments');

    // Fetch unpaid sales with their items
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items(
          *,
          medication:medications(*),
          batch:medication_batches(*)
        )
      `)
      .or(`patient_id.eq.${patientId},guest_patient_id.eq.${patientId}`)
      .eq('payment_status', 'unpaid')
      .eq('tenant_id', profile.tenant_id);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      throw salesError;
    }

    console.log('Found', sales?.length || 0, 'unpaid sales');

    return {
      success: true,
      data: {
        appointments: appointments || [],
        sales: sales || []
      }
    };
  } catch (error) {
    console.error('Error in getUnpaidItemsForPatient:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch unpaid items'
    };
  } finally {
    console.log('=== getUnpaidItemsForPatient END ===');
  }
} 