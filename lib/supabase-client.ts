// lib/supabase-client.ts
'use client';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Function to sync session from server
export async function syncSession() {
  const response = await fetch('/api/auth/session');
  const { access_token, refresh_token } = await response.json();
  console.log('Session Tokens:', { access_token, refresh_token });
  if (access_token && refresh_token) {
    await supabaseClient.auth.setSession({ access_token, refresh_token });
  }
}
