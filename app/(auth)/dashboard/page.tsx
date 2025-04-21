// app/(auth)/dashboard/page.tsx
import { requireAuth } from '@/lib/serverAuthActions';
import { getSupabaseClient } from '@/lib/supabase-server';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  // Ensure user is authenticated
  const { user } = await requireAuth();
  
  // Get user role from the database
  const supabase = await getSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profileError) {
    console.error('Error fetching profile:', profileError);
  }
  
  // Fall back to 'patient' if role couldn't be determined
  const userRole = profile?.role || 'patient';
  
  console.log("Dashboard page fetched userRole:", userRole);
  
  return <DashboardClient initialUserRole={userRole} />;
}