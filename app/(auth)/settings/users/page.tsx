// app/(auth)/settings/users/page.tsx
import UsersTable from '@/components/UsersTable';
import { fetchAllProfiles } from '@/lib/authActions';
import { createClient } from '@/app/lib/supabase/client';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <div>Please log in to manage users.</div>;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return <div>Only admins can access this page.</div>;
  }

  const profiles = await fetchAllProfiles();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
      <UsersTable profiles={profiles} />
    </div>
  );
}