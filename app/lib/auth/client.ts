import { createClient } from '../supabase/client';
import { TenantContext } from './types';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

export const supabase = createClient();

export function useAuth() {
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Get initial tenant context
    const context = getStoredTenantContext();
    setTenantContext(context);
    setLoading(false);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session) {
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
            setStoredTenantContext(context);
            setTenantContext(context);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        clearStoredTenantContext();
        setTenantContext(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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