# Authentication and Tenant Context Refactoring Plan

## Current Implementation Analysis

### Existing Files and Their Purposes

1. **Auth Client (`app/lib/auth/client.ts`)**
   - Contains `useAuth` hook
   - Manages Supabase client
   - Handles session refresh
   - Manages tenant context in localStorage

2. **Auth Server (`app/lib/auth/server.ts`)**
   - Server-side auth utilities
   - Tenant context setting via RPC

3. **Auth Types (`app/lib/auth/types.ts`)**
   - Type definitions for tenant context
   - Role definitions

4. **Auth API (`app/api/auth/route.ts`)**
   - Handles sign-in/sign-up/sign-out
   - Returns tenant context with auth responses

### Current Component Usage

Components currently use `useAuth()` hook directly for:
- User authentication state
- Tenant context
- Role information
- Loading states

## Refactoring Goals

1. Improve state management
2. Enhance error handling
3. Better testing capabilities
4. Clearer data flow
5. Maintain existing functionality
6. Avoid code duplication

## Implementation Plan

### Phase 1: Provider Setup

1. **Create Auth Provider**
   - Location: `app/providers/AuthProvider.tsx`
   - Purpose: Centralize auth state management
   - Will use existing `useAuth` hook
   - No duplication of auth logic

2. **Create Tenant Provider**
   - Location: `app/providers/TenantProvider.tsx`
   - Purpose: Separate tenant context management
   - Will use tenant data from `useAuth`
   - Reuses existing types

### Phase 2: Layout Updates

1. **Update Auth Layout**
   - File: `app/(auth)/layout.tsx`
   - Add providers
   - Maintain existing error boundary
   - Keep current route protection

### Phase 3: Component Migration

1. **Create Migration Guide**
   - Document component update process
   - List affected components
   - Provide migration examples

2. **Update Core Components**
   - `AuthenticatedLayout.tsx`
   - `PharmacyAnalyticsDashboard.tsx`
   - `InventoryManager.tsx`
   - Other high-priority components

### Phase 4: Testing and Validation

1. **Update Tests**
   - Add provider tests
   - Update component tests
   - Add integration tests

2. **Validation Steps**
   - Verify auth flow
   - Check tenant context
   - Test error handling
   - Validate session refresh

## Implementation Steps

### Step 1: Provider Implementation

1. Create `app/providers` directory
2. Implement `AuthProvider.tsx`
3. Implement `TenantProvider.tsx`
4. Add provider tests

### Step 2: Layout Updates

1. Update `app/(auth)/layout.tsx`
2. Add provider wrappers
3. Test layout changes

### Step 3: Component Migration

1. Create migration guide
2. Update components one by one
3. Test each component after update

### Step 4: Testing and Documentation

1. Update test suite
2. Add integration tests
3. Update documentation
4. Create migration guide

## Files to Create/Modify

### New Files
1. `app/providers/AuthProvider.tsx`
2. `app/providers/TenantProvider.tsx`
3. `docs/auth-migration-guide.md`

### Modified Files
1. `app/(auth)/layout.tsx`
2. `components/AuthenticatedLayout.tsx`
3. `components/pharmacy/PharmacyAnalyticsDashboard.tsx`
4. `components/InventoryManager.tsx`

### Existing Files to Keep
1. `app/lib/auth/client.ts`
2. `app/lib/auth/server.ts`
3. `app/lib/auth/types.ts`
4. `app/api/auth/route.ts`

## Testing Strategy

1. **Unit Tests**
   - Provider functionality
   - Hook behavior
   - Context updates

2. **Integration Tests**
   - Auth flow
   - Tenant context
   - Component rendering

3. **E2E Tests**
   - Complete auth flow
   - Session management
   - Error handling

## Rollout Strategy

1. **Development**
   - Implement in feature branch
   - Test thoroughly
   - Document changes

2. **Staging**
   - Deploy to staging
   - Test with real data
   - Verify all flows

3. **Production**
   - Gradual rollout
   - Monitor for issues
   - Have rollback plan

## Success Criteria

1. All tests passing
2. No regression in functionality
3. Improved error handling
4. Better testing capabilities
5. Clearer code structure
6. Maintained performance

## Next Steps

1. Review and approve plan
2. Create feature branch
3. Begin implementation
4. Regular progress updates
5. Code review process
6. Testing and validation
7. Documentation updates 