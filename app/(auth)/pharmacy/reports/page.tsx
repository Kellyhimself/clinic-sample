// app/pharmacy/reports/page.tsx
import { fetchUserRole } from '@/lib/authActions';
import ReportsDashboard from '@/components/pharmacy/ReportsDashboard';

export default async function Page() {
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return <div className="p-4 text-red-500">Access denied</div>;
  }

  return <ReportsDashboard />;
}