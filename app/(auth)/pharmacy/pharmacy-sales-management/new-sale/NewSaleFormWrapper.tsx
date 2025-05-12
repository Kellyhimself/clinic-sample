'use client';

import { useState, useEffect } from 'react';
import NewSaleForm from '@/components/pharmacy/NewSaleForm';
import type { Patient, Medication } from '@/types/supabase';
import { fetchPatients, fetchMedications } from '@/lib/newSale';
import { LimitAwareButton } from '@/components/shared/LimitAwareButton';

export default function NewSaleFormWrapper() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsData, medicationsData] = await Promise.all([
          fetchPatients(),
          fetchMedications()
        ]);
        
        setPatients(patientsData);
        setMedications(medicationsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-dashed border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <NewSaleForm 
      initialPatients={patients} 
      initialMedications={medications}
      AddGuestButton={LimitAwareButton}
    />
  );
} 