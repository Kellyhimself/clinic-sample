// app/(auth)/dashboard/page.tsx
import DashboardClient from './dashboard-client';

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <DashboardClient />
    </div>
  );
}