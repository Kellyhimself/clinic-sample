'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider } from '@/app/lib/auth/AuthProvider';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // For public routes (login/signup), just render the children
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // For protected routes, wrap with AuthProvider and AuthenticatedLayout
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </AuthProvider>
    </ErrorBoundary>
  );
}