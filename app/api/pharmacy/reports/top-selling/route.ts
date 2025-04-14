// app/api/pharmacy/reports/top-selling/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

// Define the expected response type
interface TopSellingMedication {
  medication_id: string;
  medication_name: string;
  total_quantity: number;
}

export async function GET() {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .rpc('get_top_selling_medications');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cast the data to the expected type
  const topSelling = data as TopSellingMedication[];

  return NextResponse.json(topSelling);
}