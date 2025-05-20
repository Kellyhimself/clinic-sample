import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const data = await request.json();
  const { tenantId, planType, subscription } = data;

  if (tenantId && planType && subscription) {
    try {
      // Update subscription limits based on the new plan
      const { error: limitsError } = await supabase
        .from('subscription_limits')
        .upsert({
          tenant_id: tenantId,
          plan_type: planType,
          max_patients: SUBSCRIPTION_LIMITS[planType].max_patients,
          max_appointments_per_month: SUBSCRIPTION_LIMITS[planType].max_appointments_per_month,
          max_inventory_items: SUBSCRIPTION_LIMITS[planType].max_inventory_items,
          max_users: SUBSCRIPTION_LIMITS[planType].max_users,
          max_transactions_per_month: SUBSCRIPTION_LIMITS[planType].max_transactions_per_month,
          features: {
            enabled: SUBSCRIPTION_LIMITS[planType].features
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id',
          ignoreDuplicates: false
        });

      if (limitsError) {
        console.error('Error updating subscription limits:', limitsError);
        return NextResponse.json(
          { error: 'Failed to update subscription limits' },
          { status: 500 }
        );
      }

      // Update tenant's subscription status
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_plan: planType,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (tenantError) {
        console.error('Error updating tenant:', tenantError);
        return NextResponse.json(
          { error: 'Failed to update tenant' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
} 