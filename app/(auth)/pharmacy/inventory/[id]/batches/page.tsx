import { fetchUserRole, fetchInventory } from '@/lib/authActions';
import MedicationBatches from '@/components/pharmacy/MedicationBatches';

export default async function MedicationBatchesPage({ params }: { params: { id: string } }) {
  const role = await fetchUserRole();

  if (!['admin', 'pharmacist'].includes(role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const medications = await fetchInventory();
  const medication = medications.find(m => m.id === params.id);

  if (!medication) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Medication Not Found</h1>
          <p>The medication you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return <MedicationBatches medication={medication} />;
} 