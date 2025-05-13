// app/api/pharmacy/audit-logs/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`