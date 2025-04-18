// app/(auth)/layout.tsx
import { getSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { User } from '@supabase/supabase-js';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  let initialUserRole = 'patient';
  if (profileError || !profile) {
    const { error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || 'default@example.com',
        phone_number: user.phone || '+0000000000',
        full_name: user.user_metadata?.full_name || 'Unknown User',
        role: 'patient',
      });
    if (insertError) {
      console.error('Error creating profile:', insertError.message);
      redirect('/login');
    }
  } else if (profile?.role) {
    initialUserRole = profile.role;
  }

  async function handleLogout() {
    'use server';
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    redirect('/');
  }

  return (
    <AuthenticatedLayout
      handleLogout={handleLogout}
      userRole={initialUserRole} // Renamed to initialUserRole
      user={user}
      
    >
      {children} {/* Unchanged, passes all children as-is */}
    </AuthenticatedLayout>
  );
}

export type AuthLayoutProps = {
  userRole: string;
  user?: User;
  profile?: { role: string };
  handleLogout?: () => Promise<void>;
};