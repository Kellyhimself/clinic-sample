// API route to provide session
// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }
  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}