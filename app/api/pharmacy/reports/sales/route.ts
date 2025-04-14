// app/api/pharmacy/reports/sales/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { fetchUserRole } from '@/lib/authActions';

// Define the expected response type
interface SaleReport {
  id: string;
  quantity: number;
  unit_price: number;
  sale_date: string;
  medication: { name: string } | null;
  patient: { full_name: string } | null;
}

// Raw type from Supabase query to help with transformation
interface RawSale {
  id: string;
  quantity: number;
  unit_price: number;
  sale_date: string;
  medication: { name: string }[] | null; // Array due to Supabase default behavior
  patient: { full_name: string }[] | null; // Array due to Supabase default behavior
}

export async function GET(request: Request) {
  const supabase = await getSupabaseClient();
  const role = await fetchUserRole();
  if (!['admin', 'pharmacist'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');

  let query = supabase
    .from('sales')
    .select('id, quantity, unit_price, sale_date, medication:medication_id(name), patient:patient_id(full_name)')
    .order('sale_date', { ascending: false });

  if (period) {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'daily':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
    }
    query = query.gte('sale_date', startDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform the raw data to match SaleReport
  const salesData: SaleReport[] = (data as RawSale[]).map((sale) => ({
    id: sale.id,
    quantity: sale.quantity,
    unit_price: sale.unit_price,
    sale_date: sale.sale_date,
    medication: sale.medication && sale.medication.length > 0 ? { name: sale.medication[0].name } : null,
    patient: sale.patient && sale.patient.length > 0 ? { full_name: sale.patient[0].full_name } : null,
  }));

  return NextResponse.json(salesData);
}