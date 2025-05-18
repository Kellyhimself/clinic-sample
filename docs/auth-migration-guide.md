# Authentication and Tenant Context Migration Guide

## Overview

This guide outlines the process of migrating components from using the `useAuth` hook directly to using the new `AuthProvider` and `TenantProvider` contexts.

## Migration Steps

### 1. Update Layout

First, ensure your layout is wrapped with the providers:

```tsx
// app/(auth)/layout.tsx
'use client';

import { AuthProvider } from '@/app/providers/AuthProvider';
import { TenantProvider } from '@/app/providers/TenantProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        {children}
      </TenantProvider>
    </AuthProvider>
  );
}
```

### 2. Update Components

#### Before:
```tsx
import { useAuth } from '@/app/lib/auth/client';

export function MyComponent() {
  const { user, tenantId, role, loading } = useAuth();
  // ...
}
```

#### After:
```tsx
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';

export function MyComponent() {
  const { user, loading } = useAuthContext();
  const { tenantId, role } = useTenant();
  // ...
}
```

## Affected Components

The following components need to be updated:

1. `components/AuthenticatedLayout.tsx`
2. `components/pharmacy/PharmacyAnalyticsDashboard.tsx`
3. `components/InventoryManager.tsx`
4. Any other components using `useAuth` directly

## Benefits

1. **Better Error Handling**
   - Clear error messages when providers are missing
   - Type-safe context usage

2. **Improved Testing**
   - Easier to mock auth/tenant context
   - Better component isolation

3. **Clearer Data Flow**
   - Separation of auth and tenant concerns
   - More predictable state management

## Testing

When updating components, ensure to:

1. Test auth-dependent functionality
2. Verify tenant context access
3. Check loading states
4. Validate error handling

## Common Issues

1. **Missing Provider**
   - Error: "useAuthContext must be used within an AuthProvider"
   - Solution: Ensure component is wrapped with AuthProvider

2. **Missing Tenant Context**
   - Error: "useTenant must be used within a TenantProvider"
   - Solution: Ensure component is wrapped with TenantProvider

3. **Type Errors**
   - Solution: Use the correct types from the context

## Best Practices

1. Use `useAuthContext` for user authentication
2. Use `useTenant` for tenant-specific data
3. Handle loading states appropriately
4. Implement proper error boundaries
5. Test all auth-dependent functionality

## Rollback Plan

If issues arise:

1. Revert to using `useAuth` directly
2. Remove provider wrappers
3. Update components back to original implementation

## Support

For questions or issues:
1. Check the documentation
2. Review the implementation plan
3. Contact the development team 