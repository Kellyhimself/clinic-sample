import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function getServerSession() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  return session;
}

export async function getServerUser() {
  const session = await getServerSession();
  return session?.user || null;
}

export async function requireAuth() {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  return session;
} 
 