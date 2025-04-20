'use client';

// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

// Client-side client
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Export a default client for backward compatibility
export const supabase = createClient();

export interface PatientSummaryData {
  id: string;
  full_name: string;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  prescriptions: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    quantity: number;
    prescription_date: string;
  }>;
  purchases: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    sale_date: string;
    medication: {
      name: string;
    };
  }>;
  medical_records: Array<{
    id: string;
    diagnosis: string;
    treatment: string;
    record_date: string;
    doctor: {
      full_name: string;
    };
  }>;
}