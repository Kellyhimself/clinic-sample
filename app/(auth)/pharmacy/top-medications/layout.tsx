import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top Selling Medications',
  description: 'View the most popular medications by sales volume',
};

export default function TopMedicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 