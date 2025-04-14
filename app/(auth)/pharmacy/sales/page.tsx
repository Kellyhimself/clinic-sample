// app/pharmacy/sales/page.tsx
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';
import SaleForm from '@/components/pharmacy/SaleForm';

async function fetchData() {
  const supabase = await getSupabaseClient();
  const { data: medications, error: medError } = await supabase
    .from('medications')
    .select('id, name, unit_price, quantity_in_stock')
    .eq('is_active', true);
  const { data: patients, error: patientError } = await supabase
    .from('profiles')
    .select('id, full_name');
  const { data: prescriptions, error: prescError } = await supabase
    .from('prescriptions')
    .select('id, medication_name, patient_id, quantity');

  if (medError || patientError || prescError) {
    throw new Error(
      medError?.message || patientError?.message || prescError?.message || 'Failed to fetch data'
    );
  }

  return {
    medications: medications || [],
    patients: patients || [],
    prescriptions: prescriptions || [],
  };
}

export default async function Page() {
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  const { medications, patients, prescriptions } = await fetchData();

  return (
    <SaleForm
      medications={medications}
      patients={patients}
      prescriptions={prescriptions}
    />
  );
}