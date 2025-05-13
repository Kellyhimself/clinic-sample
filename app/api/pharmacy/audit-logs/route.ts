// app/api/pharmacy/audit-logs/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        created_at,
        created_by,
        profiles:created_by (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}