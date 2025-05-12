import { createClient } from '@/app/lib/supabase/server';

export async function setTenantContext(tenantId: string) {
  const supabase = await createClient();
  
  // Set tenant context using RPC
  const { error } = await supabase.rpc('set_tenant_context', {
    p_tenant_id: tenantId
  });

  if (error) {
    console.error('Error setting tenant context:', error);
    throw error;
  }

  return true;
} 