'use client';

import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { Database } from '@/types/supabase';

// Browser client for client-side operations
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Client-side compatible server client implementation
export function createClientSupabaseClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document !== 'undefined') {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
          }
          return '';
        },
        set(name: string, value: string, options: CookieOptions) {
          if (typeof document !== 'undefined') {
            let cookie = `${name}=${value}`;
            if (options.maxAge) {
              cookie += `; max-age=${options.maxAge}`;
            }
            if (options.path) {
              cookie += `; path=${options.path}`;
            }
            if (options.domain) {
              cookie += `; domain=${options.domain}`;
            }
            if (options.sameSite) {
              cookie += `; samesite=${options.sameSite}`;
            }
            if (options.secure) {
              cookie += '; secure';
            }
            document.cookie = cookie;
          }
        },
        remove(name: string, options: CookieOptions) {
          if (typeof document !== 'undefined') {
            document.cookie = `${name}=; max-age=0; path=${options.path || '/'}`;
          }
        },
      },
    }
  );
} 