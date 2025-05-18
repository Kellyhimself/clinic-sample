import { createClient } from '@/app/lib/supabase/server';
import { fetchUserRole } from '@/lib/authActions';
import { redirect } from 'next/navigation';
import InventoryForm from '@/components/pharmacy/InventoryForm';
import ErrorDisplay from '@/components/shared/ErrorDisplay';

export default async function AddInventoryPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return <ErrorDisplay 
        type="connection"
        error={authError}
        onRetry={() => window.location.reload()}
      />;
    }

    if (!user) {
      return <ErrorDisplay 
        type="auth"
        onSignIn={() => window.location.href = '/auth/signin'}
      />;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    if (!['admin', 'pharmacist'].includes(profile.role)) {
      redirect('/dashboard');
    }

    return <InventoryForm />;
  } catch (error) {
    return <ErrorDisplay 
      type="error"
      error={error}
      onRetry={() => window.location.reload()}
    />;
  }
} 