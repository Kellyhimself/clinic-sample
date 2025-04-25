// API route to provide session
// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await getSupabaseClient();
  
  // SECURITY BEST PRACTICE:
  // First verify user is authenticated using getUser() which contacts the Supabase Auth server
  // This ensures the user data is authentic and not just read from cookies
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Once we've verified user authentication, it's safe to get the session tokens
  // We're using getSession() only to access the tokens, not to verify authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }
  
  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}