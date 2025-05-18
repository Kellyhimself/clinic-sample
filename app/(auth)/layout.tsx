'use client';

import { usePathname } from 'next/navigation';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // For public routes (login/signup), just render the children
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // For all protected routes, wrap with AuthProvider and AuthenticatedLayout
  return (
    <ErrorBoundary>
      
        <AuthenticatedLayout >{children}</AuthenticatedLayout>
      
    </ErrorBoundary>
  );
}