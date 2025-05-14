import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// This client should only be used in server-side code
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase credentials:', { 
      hasUrl: !!url, 
      hasKey: !!key 
    });
    throw new Error('Missing Supabase credentials');
  }

  console.log('Creating admin client with:', {
    url,
    hasKey: !!key,
    keyLength: key.length
  });

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} 