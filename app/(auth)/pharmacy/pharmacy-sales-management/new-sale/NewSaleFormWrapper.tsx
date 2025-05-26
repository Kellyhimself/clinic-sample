'use client';

import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import NewSaleForm from '@/components/pharmacy/NewSaleForm';
import { useMedications, usePatients } from '@/lib/hooks/usePharmacyQueries';

export default function NewSaleFormWrapper() {
  const { user, loading: authLoading } = useAuthContext();
  const { tenantId } = useTenant();

  // Use TanStack Query hooks
  const { 
    data: patients = [], 
    isLoading: isLoadingPatients,
    error: patientsError 
  } = usePatients();

  const { 
    data: medications = [], 
    isLoading: isLoadingMedications,
    error: medicationsError 
  } = useMedications();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !tenantId) {
    return (
      <div className="p-4 border-dashed border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <p>Please sign in to access this page</p>
        </div>
      </div>
    );
  }

  if (isLoadingPatients || isLoadingMedications) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (patientsError || medicationsError) {
    const error = patientsError || medicationsError;
    return (
      <div className="p-4 border-dashed border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <p>{error instanceof Error ? error.message : 'Failed to fetch data'}</p>
        </div>
      </div>
    );
  }

  return (
    <NewSaleForm 
      initialPatients={patients} 
      initialMedications={medications}
    />
  );
} 