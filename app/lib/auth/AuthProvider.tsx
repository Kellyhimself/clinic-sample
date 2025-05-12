'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './client';
import { TenantContext } from './types';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  tenantContext: TenantContext | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  tenantContext: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const initializeAuth = useCallback(async () => {
      try {
        setLoading(true);
        // Get auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (user) {
          setUser(user);
          
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, tenants!inner(*)')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

        if (profile && profile.tenant_id && profile.tenants?.name) {
            // Create tenant context from profile
            const context: TenantContext = {
              id: profile.tenant_id,
              name: profile.tenants.name,
            role: profile.role as TenantContext['role']
            };
            
            setTenantContext(context);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize auth'));
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setTenantContext(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
        await initializeAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  return (
    <AuthContext.Provider value={{ user, tenantContext, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 