// app/patients/page.tsx

import { fetchUserRole } from '@/lib/authActions';
import Link from 'next/link';

export default async function PatientsPage() {
  const role = await fetchUserRole();
  if (!['admin', 'doctor', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, full_name, phone_number, date_of_birth, gender')
    .order('full_name');

  if (error) {
    return <div className="p-4 text-red-500">Error loading patients: {error.message}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Patients</h1>
      <div className="grid gap-4">
        {patients?.map((patient) => (
          <div key={patient.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <Link href={`/patients/${patient.id}`} className="block">
              <h2 className="text-lg font-semibold text-blue-600 hover:underline">
                {patient.full_name}
              </h2>
              <p className="text-sm text-gray-600">Phone: {patient.phone_number || 'N/A'}</p>
              <p className="text-sm text-gray-600">
                {patient.date_of_birth ? `DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}` : 'DOB: N/A'}
              </p>
              <p className="text-sm text-gray-600">Gender: {patient.gender || 'N/A'}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}