import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant ID found' }, { status: 401 });
  }

  // Set tenant context
  const { error: setContextError } = await supabase
    .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

  if (setContextError) {
    return NextResponse.json({ error: 'Failed to set tenant context' }, { status: 500 });
  }

  // Get tenant ID from context
  const { data: tenantId, error: getTenantError } = await supabase
    .rpc('get_tenant_id');

  if (getTenantError || !tenantId) {
    return NextResponse.json({ error: 'Failed to get tenant ID' }, { status: 500 });
  }

  try {
    const { test } = await request.json();
    // Example: Perform tenant-specific operation
    const { data } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    return NextResponse.json({ test, tenant: data?.name });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}