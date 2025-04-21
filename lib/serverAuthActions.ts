'use server';

import { getSupabaseClient } from './supabase-server';
import { redirect } from 'next/navigation';

/**
 * Server action to get the current user and redirect if not authenticated
 * This should be used at the top of protected pages
 */
export async function requireAuth() {
  const supabase = await getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }
  
  return { user };
}

/**
 * Server action to get the current user and redirect if authenticated
 * This should be used at the top of public pages that should not be 
 * accessible to authenticated users
 */
export async function requireNoAuth() {
  const supabase = await getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (user && !error) {
    redirect('/dashboard');
  }
  
  return { user: null };
}

/**
 * Server action to get user data without redirecting
 */
export async function getUser() {
  const supabase = await getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return { user: null };
  }
  
  return { user };
} 