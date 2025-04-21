import { Metadata } from 'next';
import { requireAuth } from '@/lib/serverAuthActions';
import ReportsClient from '@/components/reports-client';

export const metadata: Metadata = {
  title: 'Reports Dashboard | Clinic Management System',
  description: 'View and analyze clinic performance metrics and statistics',
};

export default async function ReportsPage() {
  // Ensure user is authenticated
  const { user } = await requireAuth();
  
  return <ReportsClient />;
} 