'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Server-side Supabase client with enhanced support for views
export async function getSupabaseClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.error(`Failed to set cookie ${name}:`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
            console.error(`Failed to remove cookie ${name}:`, error);
          }
        },
      },
    }
  );

  return client;
}

// Server actions for cookie operations
export async function setAuthCookie(name: string, value: string, options: CookieOptions) {
  const cookieStore = await cookies();
  cookieStore.set({ name, value, ...options });
}

export async function removeAuthCookie(name: string, options: CookieOptions) {
  const cookieStore = await cookies();
  cookieStore.set({ name, value: '', ...options, maxAge: 0 });
} 