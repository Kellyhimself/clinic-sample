import { createAdminClient } from './supabase-server';
import { Database } from '@/types/supabase';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
type SubscriptionPlanUpdate = Database['public']['Tables']['subscription_plans']['Update'];

export async function updateStripePriceIds(proPriceId: string, enterprisePriceId: string) {
  const supabase = await createAdminClient();
  
  try {
    // Update Pro plan price ID
    const { error: proError } = await supabase
      .from('subscription_plans')
      .update({ stripe_price_id: proPriceId } as SubscriptionPlanUpdate)
      .eq('name', 'Pro Plan');
    
    if (proError) throw proError;
    
    // Update Enterprise plan price ID
    const { error: enterpriseError } = await supabase
      .from('subscription_plans')
      .update({ stripe_price_id: enterprisePriceId } as SubscriptionPlanUpdate)
      .eq('name', 'Enterprise Plan');
    
    if (enterpriseError) throw enterpriseError;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating Stripe price IDs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update Stripe price IDs'
    };
  }
}

export async function getStripePriceIds() {
  const supabase = await createAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('name, stripe_price_id')
      .in('name', ['Pro Plan', 'Enterprise Plan'])
      .returns<SubscriptionPlan[]>();
      
    if (error) throw error;
    
    const priceIds = {
      pro: data.find(item => item.name === 'Pro Plan')?.stripe_price_id,
      enterprise: data.find(item => item.name === 'Enterprise Plan')?.stripe_price_id
    };
    
    return { success: true, priceIds };
  } catch (error) {
    console.error('Error getting Stripe price IDs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get Stripe price IDs'
    };
  }
} 