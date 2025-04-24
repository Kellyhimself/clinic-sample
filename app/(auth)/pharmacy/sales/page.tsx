// app/pharmacy/sales/page.tsx
import { Metadata } from 'next';
import PharmacySalesManager from '@/components/pharmacy/PharmacySalesManager';

export const metadata: Metadata = {
  title: 'Pharmacy Sales Management',
  description: 'Manage medication sales and pharmacy transactions',
};

export default function PharmacySalesPage() {
  return (
    <main className="container mx-auto">
      <PharmacySalesManager />
    </main>
  );
}