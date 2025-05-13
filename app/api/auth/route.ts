import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { action, email, password, full_name } = await request.json();

  try {
    if (action === 'sign-in') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, tenant_id')
        .eq('id', data.user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('id', profile.tenant_id)
        .single();

      return NextResponse.json({
        user: data.user,
        tenantContext: {
          id: tenant?.id || '',
          name: tenant?.name || 'Clinic',
          role: profile.role || 'user',
        },
      });
    }

    if (action === 'sign-up') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } }
      });
      if (error) throw new Error(error.message);

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user!.id,
        email,
        full_name,
        role: 'user',
        tenant_id: null, // Assign tenant later via invitation
      });
      if (profileError) throw new Error(profileError.message);

      return NextResponse.json({ user: data.user });
    }

    if (action === 'sign-out') {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      return NextResponse.json({ message: 'Signed out' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}