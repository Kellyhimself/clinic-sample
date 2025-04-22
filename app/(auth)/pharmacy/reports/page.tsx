// app/pharmacy/reports/page.tsx
import { fetchUserRole } from '@/lib/authActions';
import PharmacyReportsDashboard from '@/components/pharmacy/PharmacyReportsDashboard';

export default async function Page() {
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  return <PharmacyReportsDashboard />;
}