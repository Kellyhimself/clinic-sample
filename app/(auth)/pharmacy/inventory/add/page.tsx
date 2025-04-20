import { fetchUserRole } from '@/lib/authActions';
import InventoryForm from '@/components/pharmacy/InventoryForm';

export default async function AddInventoryPage() {
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

  return (
    <div className="container mx-auto py-6">
      <InventoryForm />
    </div>
  );
} 