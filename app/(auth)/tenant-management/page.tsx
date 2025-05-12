import { Suspense } from 'react';
import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tenant } from '@/types/supabase';
import TenantList from '@/components/tenant-management-components/TenantList';
import TenantStats from '@/components/tenant-management-components/TenantStats';
import TenantCreateForm from '@/components/tenant-management-components/TenantCreateForm';

export const metadata = {
  title: 'Tenant Management - Clinic System',
};

async function fetchTenants() {
  const supabase = await createClient();
  
  // First check if user is admin
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/dashboard'); // Not an admin, redirect to dashboard
  }
  
  // Fetch all tenants
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
  
  return tenants;
}

export default async function TenantManagementPage() {
  const tenants = await fetchTenants();
  
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tenant Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tenants</h2>
            <Suspense fallback={<div>Loading tenants...</div>}>
              <TenantList initialTenants={tenants} />
            </Suspense>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Tenant Statistics</h2>
            <Suspense fallback={<div>Loading stats...</div>}>
              <TenantStats tenants={tenants} />
            </Suspense>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Tenant</h2>
            <TenantCreateForm />
          </div>
        </div>
      </div>
    </main>
  );
} 