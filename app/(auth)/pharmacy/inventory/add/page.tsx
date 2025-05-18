import { createClient } from '@/app/lib/supabase/server';
import { fetchUserRole } from '@/lib/authActions';
import { redirect } from 'next/navigation';
import InventoryForm from '@/components/pharmacy/InventoryForm';

export default async function AddInventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['admin', 'pharmacist'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return <InventoryForm />;
} 