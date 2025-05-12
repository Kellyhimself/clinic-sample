import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tracking_id, payment_status, payment_method } = body;
    
    // Update transaction status
    const supabase = createAdminClient();
    await supabase
      .from('pesapal_transactions')
      .update({
        status: payment_status.toLowerCase(),
        payment_method,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_id', tracking_id);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("PesaPal IPN Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 