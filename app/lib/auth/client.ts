import { createClient } from '../supabase/client';
import { TenantContext } from './types';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

export const supabase = createClient();

// Add session refresh interval (5 minutes)
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000;

export function useAuth() {
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    // Function to refresh session and tenant context
    const refreshSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // Refresh tenant context
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, tenant_id')
            .eq('id', session.user.id)
            .single();

          if (profile?.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('id, name')
              .eq('id', profile.tenant_id)
              .single();

            if (tenant) {
              const context: TenantContext = {
                id: tenant.id,
                name: tenant.name,
                role: (profile.role as TenantContext['role']) || 'user',
              };
              
              // Invalidate queries for old tenant if switching
              const oldContext = getStoredTenantContext();
              if (oldContext && oldContext.id !== tenant.id) {
                queryClient.invalidateQueries({ queryKey: ['medications', oldContext.id] });
                queryClient.invalidateQueries({ queryKey: ['patients', oldContext.id] });
                queryClient.invalidateQueries({ queryKey: ['sales', oldContext.id] });
                queryClient.invalidateQueries({ queryKey: ['batches', oldContext.id] });
                queryClient.invalidateQueries({ queryKey: ['topSelling', oldContext.id] });
                queryClient.invalidateQueries({ queryKey: ['profitMargins', oldContext.id] });
              }
              
              setStoredTenantContext(context);
              setTenantContext(context);
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    };

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshSession().finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Get initial tenant context
    const context = getStoredTenantContext();
    setTenantContext(context);

    // Set up session refresh interval
    refreshInterval = setInterval(refreshSession, SESSION_REFRESH_INTERVAL);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session) {
        await refreshSession();
      } else if (event === 'SIGNED_OUT') {
        // Clear tenant context and invalidate queries on sign out
        const oldContext = getStoredTenantContext();
        if (oldContext) {
          queryClient.invalidateQueries({ queryKey: ['medications', oldContext.id] });
          queryClient.invalidateQueries({ queryKey: ['patients', oldContext.id] });
          queryClient.invalidateQueries({ queryKey: ['sales', oldContext.id] });
          queryClient.invalidateQueries({ queryKey: ['batches', oldContext.id] });
          queryClient.invalidateQueries({ queryKey: ['topSelling', oldContext.id] });
          queryClient.invalidateQueries({ queryKey: ['profitMargins', oldContext.id] });
        }
        clearStoredTenantContext();
        setTenantContext(null);
      }
    });

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  return {
    user,
    tenantId: tenantContext?.id,
    role: tenantContext?.role,
    loading,
  };
}

export function getStoredTenantContext(): TenantContext | null {
  if (typeof window === 'undefined') return null;
  const tenant = localStorage.getItem('tenantContext');
  return tenant ? JSON.parse(tenant) : null;
}

export function setStoredTenantContext(context: TenantContext) {
  localStorage.setItem('tenantContext', JSON.stringify(context));
}

export function clearStoredTenantContext() {
  localStorage.removeItem('tenantContext');
}

export async function signIn(email: string, password: string) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sign-in', email, password }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  
  // Set tenant context from the response
  if (data.tenantContext) {
    setStoredTenantContext(data.tenantContext);
  }
  
  return data.user;
}

export async function signUp(email: string, password: string, full_name: string) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sign-up', email, password, full_name }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.user;
}

export async function signOut() {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sign-out' }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  clearStoredTenantContext();
}