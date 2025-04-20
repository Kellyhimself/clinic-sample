// app/patients/[id]/page.tsx
import { fetchUserRole, fetchPatientSummary } from '@/lib/authActions';
import { PatientSummaryData } from '@/lib/supabase';

export default async function Page({ params }: { params: { id: string } }) {
  const role = await fetchUserRole();
  if (!['admin', 'doctor', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  const patientSummary = await fetchPatientSummary(params.id) as PatientSummaryData;
  if (!patientSummary) {
    return <div className="p-4 text-red-500">Patient not found</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{patientSummary.full_name}</h1>
        <p className="text-gray-600">ID: {patientSummary.id}</p>
        <p className="text-gray-600">Phone: {patientSummary.phone_number || 'N/A'}</p>
        <p className="text-gray-600">
          DOB: {patientSummary.date_of_birth ? new Date(patientSummary.date_of_birth).toLocaleDateString() : 'N/A'}
        </p>
        <p className="text-gray-600">Gender: {patientSummary.gender || 'N/A'}</p>
        <p className="text-gray-600">Address: {patientSummary.address || 'N/A'}</p>
      </div>

      <div className="grid gap-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Prescriptions</h2>
          <div className="grid gap-4">
            {patientSummary.prescriptions.map((prescription) => (
              <div key={prescription.id} className="border rounded-lg p-4">
                <h3 className="font-medium">Prescription #{prescription.id}</h3>
                <p className="text-sm text-gray-600">
                  Date: {new Date(prescription.prescription_date).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <h4 className="font-medium">Medication:</h4>
                  <p className="text-sm">
                    {prescription.medication_name} - {prescription.dosage} x {prescription.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Purchases</h2>
          <div className="grid gap-4">
            {patientSummary.purchases.map((purchase) => (
              <div key={purchase.id} className="border rounded-lg p-4">
                <h3 className="font-medium">Purchase #{purchase.id}</h3>
                <p className="text-sm text-gray-600">
                  Date: {new Date(purchase.sale_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Total: ${(purchase.quantity * purchase.unit_price).toFixed(2)}
                </p>
                <div className="mt-2">
                  <h4 className="font-medium">Item:</h4>
                  <p className="text-sm">
                    {purchase.medication.name} - {purchase.quantity} x ${purchase.unit_price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Medical Records</h2>
          <div className="grid gap-4">
            {patientSummary.medical_records.map((record) => (
              <div key={record.id} className="border rounded-lg p-4">
                <h3 className="font-medium">Record #{record.id}</h3>
                <p className="text-sm text-gray-600">
                  Date: {new Date(record.record_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">Doctor: {record.doctor.full_name}</p>
                <p className="text-sm text-gray-600">Diagnosis: {record.diagnosis}</p>
                <p className="mt-2">Treatment: {record.treatment}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}