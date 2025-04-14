// app/patients/[id]/page.tsx
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

interface PatientSummaryData {
  id: string;
  full_name: string;
  prescriptions: { id: string; medication_name: string; dosage: string; quantity: number; prescription_date: string }[];
  purchases: { id: string; quantity: number; unit_price: number; sale_date: string; medication: { name: string } }[];
  medical_records: { id: string; diagnosis: string; treatment: string; record_date: string; doctor: { full_name: string } }[];
}

async function fetchPatientSummary(patientId: string): Promise<PatientSummaryData> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('patient_summary')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) throw new Error(error.message);

  const { data: prescriptions, error: prescError } = await supabase
    .from('prescriptions')
    .select('id, medication_name, dosage, quantity, prescription_date')
    .eq('patient_id', patientId);

  const { data: rawPurchases, error: purchError } = await supabase
    .from('sales')
    .select('id, quantity, unit_price, sale_date, medication:medication_id(name)')
    .eq('patient_id', patientId);

  const { data: rawMedicalRecords, error: recordError } = await supabase
    .from('medical_records')
    .select('id, diagnosis, treatment, record_date, doctor:doctor_id(full_name)')
    .eq('patient_id', patientId);

  if (prescError || purchError || recordError) {
    throw new Error(
      prescError?.message || purchError?.message || recordError?.message || 'Failed to fetch patient data'
    );
  }

  // Transform purchases to match the expected type
  const purchases = (rawPurchases || []).map((purchase) => ({
    id: purchase.id,
    quantity: purchase.quantity,
    unit_price: purchase.unit_price,
    sale_date: purchase.sale_date,
    medication: purchase.medication && purchase.medication.length > 0 ? { name: purchase.medication[0].name } : { name: 'Unknown' },
  }));

  // Transform medical_records to match the expected type
  const medical_records = (rawMedicalRecords || []).map((record) => ({
    id: record.id,
    diagnosis: record.diagnosis,
    treatment: record.treatment,
    record_date: record.record_date,
    doctor: record.doctor && record.doctor.length > 0 ? { full_name: record.doctor[0].full_name } : { full_name: 'Unknown' },
  }));

  return {
    ...(data as Omit<PatientSummaryData, 'prescriptions' | 'purchases' | 'medical_records'>),
    prescriptions: prescriptions || [],
    purchases,
    medical_records,
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const role = await fetchUserRole();
  if (!['admin', 'doctor', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  const summary = await fetchPatientSummary(params.id);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Patient Summary: {summary.full_name}</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Prescriptions</h2>
        {summary.prescriptions.length > 0 ? (
          <ul className="list-disc pl-5">
            {summary.prescriptions.map((presc) => (
              <li key={presc.id}>
                {presc.medication_name} - {presc.dosage}, {presc.quantity} units on{' '}
                {new Date(presc.prescription_date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No prescriptions found.</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Purchases</h2>
        {summary.purchases.length > 0 ? (
          <ul className="list-disc pl-5">
            {summary.purchases.map((purchase) => (
              <li key={purchase.id}>
                {purchase.medication.name} - {purchase.quantity} units at KSh {purchase.unit_price} on{' '}
                {new Date(purchase.sale_date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No purchases found.</p>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Medical Records</h2>
        {summary.medical_records.length > 0 ? (
          <ul className="list-disc pl-5">
            {summary.medical_records.map((record) => (
              <li key={record.id}>
                {record.diagnosis} - {record.treatment} by {record.doctor.full_name} on{' '}
                {new Date(record.record_date).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No medical records found.</p>
        )}
      </div>
    </div>
  );
}