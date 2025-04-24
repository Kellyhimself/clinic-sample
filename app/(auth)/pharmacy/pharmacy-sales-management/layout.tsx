import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pharmacy Sales Management',
  description: 'Manage medication sales and pharmacy transactions',
};

export default function PharmacySalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 