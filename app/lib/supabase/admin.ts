import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// This client should only be used in server-side code
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} 