import { createClient } from '@/app/lib/supabase/server';
import CashierForm from '@/components/cashier/CashierForm';
import { redirect } from 'next/navigation';

export default async function CashierPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'cashier'].includes(profile.role)) {
    redirect('/');
  }

  if (!profile.tenant_id) {
    throw new Error('No tenant ID found');
  }

  // Set tenant context
  await supabase.rpc('set_tenant_context', {
    p_tenant_id: profile.tenant_id
  });

  // Get unique patient IDs from unpaid sales
  const { data: sales } = await supabase
    .from('sales')
    .select('patient_id')
    .eq('payment_status', 'unpaid')
    .eq('tenant_id', profile.tenant_id);

  const patientIds = [...new Set(sales?.map(sale => sale.patient_id).filter(Boolean) || [])];

  // Fetch patients with unpaid sales
  const { data: patients } = await supabase
    .from('guest_patients')
    .select('*')
    .in('id', patientIds)
    .eq('tenant_id', profile.tenant_id);

  return (
    <CashierForm 
      initialPatients={patients || []} 
      initialUnpaidItems={{ appointments: [], sales: [] }}
    />
  );
} 