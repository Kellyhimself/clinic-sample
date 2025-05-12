import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tracking_id, payment_status, payment_method } = body;
    
    // Get the transaction from our database
    const supabase = createAdminClient();
    const { data: transactionData, error: fetchError } = await supabase
      .from('pesapal_transactions')
      .select('*')
      .eq('tracking_id', tracking_id)
      .single();
      
    if (fetchError || !transactionData) {
      console.error("Transaction not found:", tracking_id);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    
    // Update the transaction status
    if (payment_status === 'COMPLETED') {
      const { tenant_id, plan_id } = transactionData;
      
      // Get plan details
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('duration_days')
        .eq('id', plan_id)
        .single();
        
      const durationDays = planData?.duration_days || 30;
      
      // Calculate next billing date
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + durationDays);
      
      // Update tenant subscription status
      const { error: tenantUpdateError } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'active',
          subscription_plan: plan_id,
          last_payment_date: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          payment_method: 'pesapal',
        })
        .eq('id', tenant_id);
        
      if (tenantUpdateError) {
        console.error("Failed to update tenant subscription:", tenantUpdateError);
      }
      
      // Add to payment history
      await supabase.from('payment_history').insert({
        tenant_id,
        plan_id,
        amount: transactionData.amount,
        payment_method: 'pesapal',
        status: 'completed',
        reference: tracking_id,
        payment_date: new Date().toISOString(),
      });
    }
    
    // Update transaction status
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
    console.error("PesaPal Callback Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 