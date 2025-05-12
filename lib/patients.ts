'use server';

import { createClient } from '@/app/lib/supabase/server';
import { checkUsageLimit } from '@/app/lib/server-utils';
import type { Database } from '@/types/supabase';

type GuestPatientRow = Database['public']['Tables']['guest_patients']['Row'];
type Patient = GuestPatientRow;

// Cache for quick sale patients per tenant
const quickSalePatientCache = new Map<string, { patient: Patient; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Creates a guest patient in the guest_patients table
 */
export async function createGuestPatient(patientInput: {
    full_name: string;
    phone_number: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    notes?: string;
  }): Promise<{ success: boolean; patient?: Patient; message?: string }> {
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

      if (!profile?.tenant_id) {
        throw new Error('No tenant ID found for user');
      }

      // Set tenant context
      const { error: setContextError } = await supabase
        .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

      if (setContextError) {
        throw new Error('Failed to set tenant context');
      }

      // Get tenant ID from context
      const { data: tenantId, error: getTenantError } = await supabase
        .rpc('get_tenant_id');

      if (getTenantError || !tenantId) {
        throw new Error('Failed to get tenant ID');
      }

      // Check patient limits
      const { allowed, current, limit } = await checkUsageLimit(tenantId, 'max_patients');
      if (!allowed) {
        return {
          success: false,
          message: `Patient limit reached (${current}/${limit}). Please upgrade your plan to add more patients.`
        };
      }
    
      // Validate mandatory fields
      if (!patientInput.full_name?.trim()) {
        throw new Error('Full name is required');
      }
      
      if (!patientInput.phone_number?.trim()) {
        throw new Error('Phone number is required');
      }
      
      // Format phone number if needed
      let phoneNumber = patientInput.phone_number.trim();
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+254' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }
      
      // Check if phone number is already used
      const { data: existingPatient, error: phoneCheckError } = await supabase
        .from('guest_patients')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (phoneCheckError) {
        throw new Error('Failed to verify phone number availability');
      }
      
      if (existingPatient) {
        return { 
          success: true, 
          patient: existingPatient,
          message: 'Found existing guest patient'
        };
      }
      
      // Create new guest patient
      const { data: newPatient, error: insertError } = await supabase
        .from('guest_patients')
        .insert({
          full_name: patientInput.full_name.trim(),
          phone_number: phoneNumber,
          email: patientInput.email?.trim() || null,
          date_of_birth: patientInput.date_of_birth || null,
          gender: patientInput.gender || null,
          address: patientInput.address?.trim() || null,
          notes: patientInput.notes?.trim() || null,
          patient_type: 'guest',
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_access: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        throw new Error('Failed to create guest patient');
      }
      
      return { 
        success: true,
        patient: newPatient
      };
    } catch (error) {
      console.error('Error in createGuestPatient:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }
  
  /**
   * Verifies if a patient exists in the guest_patients table
   */
  export async function verifyPatientExists(patientId: string): Promise<{ 
    success: boolean; 
    patient?: Patient; 
    message?: string 
  }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { 
        success: false, 
        message: 'Not authenticated' 
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return { 
        success: false, 
        message: 'No tenant ID found for user' 
      };
    }

    // Set tenant context
    const { error: setContextError } = await supabase
      .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

    if (setContextError) {
      return { 
        success: false, 
        message: 'Failed to set tenant context' 
      };
    }

    // Get tenant ID from context
    const { data: tenantId, error: getTenantError } = await supabase
      .rpc('get_tenant_id');

    if (getTenantError || !tenantId) {
      return { 
        success: false, 
        message: 'Failed to get tenant ID' 
      };
    }
    
    try {
      const { data: patient, error } = await supabase
        .from('guest_patients')
        .select('*')
        .eq('id', patientId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) {
        return { 
          success: false, 
          message: 'Patient not found' 
        };
      }
      
      return {
        success: true,
        patient
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to verify patient' 
      };
    }
  }
  
  /**
   * Server action to create a guest patient
   */
  export async function createGuestPatientAction(formData: FormData) {
    const patientInput = {
        full_name: formData.get('full_name') as string,
        phone_number: formData.get('phone_number') as string,
        email: formData.get('email') as string || undefined,
        date_of_birth: formData.get('date_of_birth') as string || undefined,
        gender: formData.get('gender') as string || undefined,
        address: formData.get('address') as string || undefined,
        notes: formData.get('notes') as string || undefined
    };
      
    if (!patientInput.full_name || !patientInput.phone_number) {
      return { 
        success: false, 
        message: 'Full name and phone number are required' 
      };
    }
      
    try {
      return await createGuestPatient(patientInput);
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Fetch a specific patient by ID
   */
  export async function fetchPatientById(patientId: string): Promise<Patient | null> {
    try {
      if (!patientId) return null;
      
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

      if (!profile?.tenant_id) {
        throw new Error('No tenant ID found for user');
      }

      // Set tenant context
      const { error: setContextError } = await supabase
        .rpc('set_tenant_context', { p_tenant_id: profile.tenant_id });

      if (setContextError) {
        throw new Error('Failed to set tenant context');
      }

      // Get tenant ID from context
      const { data: tenantId, error: getTenantError } = await supabase
        .rpc('get_tenant_id');

      if (getTenantError || !tenantId) {
        throw new Error('Failed to get tenant ID');
      }
      
      // Check in guest_patients table
      const { data: patient, error } = await supabase
        .from('guest_patients')
        .select('*')
        .eq('id', patientId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error || !patient) {
        console.error('Error fetching patient:', error);
        return null;
      }
      
      return patient;
    } catch (error) {
      console.error('Error in fetchPatientById:', error);
      return null;
    }
  }

/**
 * Creates or retrieves a quick sale patient for a tenant
 * Uses caching to avoid creating new patients for each quick sale
 */
export async function getOrCreateQuickSalePatient(): Promise<{ 
  success: boolean; 
  patient?: Patient; 
  message?: string 
}> {
  console.log('Starting getOrCreateQuickSalePatient...');
  try {
    const supabase = await createClient();
    console.log('Got Supabase client');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user found');
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      console.log('No tenant ID found');
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

    console.log('Got tenant context:', {
      tenantId,
      userId: user.id,
      role: profile.role
    });

    // Check cache first
    const cached = quickSalePatientCache.get(tenantId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Found quick sale patient in cache');
      return {
        success: true,
        patient: cached.patient
      };
    }
    
    // Check if a quick sale patient already exists
    const { data: existingPatient, error: existingError } = await supabase
      .from('guest_patients')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('patient_type', 'quick_sale')
      .single();
    
    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking for existing quick sale patient:', existingError);
      throw new Error('Failed to check for existing quick sale patient');
    }
    
    if (existingPatient) {
      console.log('Found existing quick sale patient:', existingPatient.id);
      // Update cache
      quickSalePatientCache.set(tenantId, { 
        patient: existingPatient, 
        timestamp: Date.now() 
      });
      return {
        success: true,
        patient: existingPatient
      };
    }
    
    // Create a new quick sale patient
    const { data: newPatient, error: createError } = await supabase
      .from('guest_patients')
      .insert({
        full_name: 'Quick Sale Customer',
        phone_number: '+254000000000',
        patient_type: 'quick_sale',
        notes: 'System-generated quick sale patient',
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_access: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating quick sale patient:', createError);
      throw new Error('Failed to create quick sale patient');
    }
    
    console.log('Successfully created new quick sale patient:', newPatient.id);
    // Update cache
    quickSalePatientCache.set(tenantId, { 
      patient: newPatient, 
      timestamp: Date.now() 
    });
    
    return {
      success: true,
      patient: newPatient
    };
  } catch (error) {
    console.error('Error in getOrCreateQuickSalePatient:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}