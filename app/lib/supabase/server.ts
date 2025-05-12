import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number }) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookie errors silently
          }
        },
        remove(name: string, options: { path?: string }) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Handle cookie errors silently
          }
        },
      },
    }
  );
}