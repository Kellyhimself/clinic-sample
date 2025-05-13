'use server';

import { createAdminClient } from '@/app/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const supabase = createAdminClient();

export async function getSubscriptionData(tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return { data: null, error };
  }
}

export async function getInvoices(tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return { data: null, error };
  }
} 