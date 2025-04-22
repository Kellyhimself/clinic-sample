import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Clinical Service',
  description: 'Record a new clinical service or medical procedure',
};

export default function NewServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 