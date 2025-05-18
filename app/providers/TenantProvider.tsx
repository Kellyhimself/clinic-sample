'use client';

import { createContext, useContext } from 'react';
import { useAuth } from '@/app/lib/auth/client';
import type { TenantContext } from '@/app/lib/auth/types';

// Define the shape of our tenant context
interface TenantContextType {
  tenantId: string | undefined;
  role: TenantContext['role'] | undefined;
}

// Create the context with a default value
const TenantContext = createContext<TenantContextType>({
  tenantId: undefined,
  role: undefined,
});

// Provider component
export function TenantProvider({ children }: { children: React.ReactNode }) {
  // Use the existing useAuth hook but only expose tenant-related data
  const { tenantId, role } = useAuth();

  return (
    <TenantContext.Provider value={{ tenantId, role }}>
      {children}
    </TenantContext.Provider>
  );
}

// Custom hook to use the tenant context
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}; 