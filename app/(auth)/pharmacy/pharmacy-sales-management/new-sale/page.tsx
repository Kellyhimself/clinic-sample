// app/sales/newsale/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/app/lib/supabase/server';
import { fetchPatients, fetchMedications } from '@/lib/newSale';
import NewSaleFormWrapper from './NewSaleFormWrapper';
import { Card, CardContent} from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default async function NewSalePage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'pharmacist', 'cashier'].includes(profile.role)) {
      throw new Error('Unauthorized: Only admins, pharmacists and cashiers can access sales');
    }

    if (!profile.tenant_id) {
      throw new Error('No tenant ID found for user');
    }

    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      console.error('Error setting tenant context:', setContextError);
      throw new Error('Failed to set tenant context');
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
      console.error('Failed to get tenant ID:', getTenantError);
      throw new Error('Failed to get tenant ID');
    }

    console.log('Tenant context set successfully:', { tenantId });

    // Now fetch the data
    const [patientsData, medicationsData] = await Promise.all([
      fetchPatients(),
      fetchMedications()
    ]);

    return (
      <div className="container mx-auto py-6">
        <Card>
           <CardContent>
            <Suspense fallback={
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            }>
              <NewSaleFormWrapper 
                initialPatients={patientsData} 
                initialMedications={medicationsData}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error in NewSalePage:', error);
    return (
      <Card className="p-4 border-dashed border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p>{error instanceof Error ? error.message : 'Failed to load required data'}</p>
        </div>
      </Card>
    );
  }
}