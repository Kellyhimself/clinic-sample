'use client';

import { usePathname } from 'next/navigation';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { TenantProvider } from '@/app/providers/TenantProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // For public routes (login/signup), just render the children
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // For all protected routes, wrap with providers and AuthenticatedLayout
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}