// components/pharmacy/StockDashboard.tsx
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';
import ClientStockDashboard from './ClientStockDashboard';
import { Medication } from '@/types/supabase';

async function fetchMedications(): Promise<Medication[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('medications')
    .select('id, name, batch_no, category, supplier_id, description, unit_price, quantity_in_stock, reorder_level, expiry_date, is_active, created_at, created_by')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(error.message);
  return (data as Medication[]) || [];
}

export default async function StockDashboard() {
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  const medications = await fetchMedications();

  return <ClientStockDashboard initialMedications={medications} />;
}