import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/app/lib/supabase/server';

// Define types for M-Pesa callback data
interface MpesaCallbackItem {
  Name: string;
  Value: string | number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Extract the response data from the M-Pesa callback
    const { Body } = body;
    
    if (!Body || !Body.stkCallback) {
      return NextResponse.json(
        { error: "Invalid callback data format" },
        { status: 400 }
      );
    }
    
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
    
    // Get the transaction from our database
    const supabase = createClient();
    const { data: transactionData, error: fetchError } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single();
      
    if (fetchError || !transactionData) {
      console.error("Transaction not found:", CheckoutRequestID);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    
    // Update the transaction status
    if (ResultCode === 0) {
      // Extract payment details from CallbackMetadata
      const Amount = CallbackMetadata?.Item?.find((item: MpesaCallbackItem) => item.Name === 'Amount')?.Value;
      const MpesaReceiptNumber = CallbackMetadata?.Item?.find((item: MpesaCallbackItem) => item.Name === 'MpesaReceiptNumber')?.Value;
      const PhoneNumber = CallbackMetadata?.Item?.find((item: MpesaCallbackItem) => item.Name === 'PhoneNumber')?.Value;
      const TransactionDate = CallbackMetadata?.Item?.find((item: MpesaCallbackItem) => item.Name === 'TransactionDate')?.Value;
      
      // Payment successful
      const { error: updateError } = await supabase
        .from('mpesa_transactions')
        .update({
          status: 'completed',
          receipt_number: MpesaReceiptNumber,
          transaction_date: TransactionDate,
          result_code: ResultCode,
          result_description: ResultDesc,
        })
        .eq('checkout_request_id', CheckoutRequestID);
        
      if (updateError) {
        console.error("Failed to update transaction:", updateError);
      }
      
      // Update the tenant's subscription status
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
          payment_method: 'mpesa',
          mpesa_phone_number: PhoneNumber,
        })
        .eq('id', tenant_id);
        
      if (tenantUpdateError) {
        console.error("Failed to update tenant subscription:", tenantUpdateError);
      }
      
      // Add to payment history
      await supabase.from('payment_history').insert({
        tenant_id,
        plan_id,
        amount: Amount,
        payment_method: 'mpesa',
        status: 'completed',
        reference: MpesaReceiptNumber,
        payment_date: new Date().toISOString(),
      });
      
    } else {
      // Payment failed
      const { error: updateError } = await supabase
        .from('mpesa_transactions')
        .update({
          status: 'failed',
          result_code: ResultCode,
          result_description: ResultDesc,
        })
        .eq('checkout_request_id', CheckoutRequestID);
        
      if (updateError) {
        console.error("Failed to update transaction:", updateError);
      }
    }
    
    // Always respond with success to the M-Pesa API
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("M-Pesa Callback Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 