import { fetchUserRole, fetchInventory } from '@/lib/authActions';
import InventoryForm from '@/components/pharmacy/InventoryForm';

export default async function EditInventoryPage({ params }: { params: { id: string } }) {
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

  // Transform the medication data to match InventoryForm's expected type
  const formData = {
    id: medication.id,
    name: medication.name,
    category: medication.category,
    manufacturer: medication.manufacturer || '',
    dosage_form: medication.dosage_form,
    strength: medication.strength,
    barcode: medication.barcode || '',
    shelf_location: medication.shelf_location || '',
    unit_price: medication.unit_price,
    description: medication.description || '',
    is_active: medication.is_active || true,
    created_at: medication.created_at || new Date().toISOString(),
    updated_at: medication.updated_at || new Date().toISOString(),
    batches: medication.batches || []
  };

  return (
    <div className="container mx-auto py-6">
      <InventoryForm initialData={formData} />
    </div>
  );
} 