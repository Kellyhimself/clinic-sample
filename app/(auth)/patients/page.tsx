// app/patients/page.tsx
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';
import Link from 'next/link';

export default async function PatientsPage() {
  const role = await fetchUserRole();
  if (!['admin', 'doctor'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  const supabase = await getSupabaseClient();
  const { data: patients, error } = await supabase.from('profiles').select('id, full_name');

  if (error) {
    return <div className="p-4 text-red-500">Error loading patients: {error.message}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Patients</h1>
      <ul className="space-y-2">
        {patients?.map((patient) => (
          <li key={patient.id}>
            <Link href={`/patients/${patient.id}`} className="text-blue-600 hover:underline">
              {patient.full_name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}