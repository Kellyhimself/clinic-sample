import { fetchUserRole } from '@/lib/authActions';
import InventoryManager from '@/components/pharmacy/InventoryManager';

export default async function InventoryPage() {
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
      <InventoryManager />
    </div>
  );
} 