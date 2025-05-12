-- SQL commands to add subscription tracking columns to the tenants table
-- Execute these in the Supabase SQL Editor

-- Add payment_method column to track which payment provider was used (stripe, pesapal, etc.)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Add last_payment_date to track when the last payment was processed
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Add subscription_start_date to track when the subscription began
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;

-- Add subscription_end_date to track when the current subscription expires
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Add subscription_period_end to store the current billing cycle end date
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
-- Add subscription_renewal_date to know when the next invoice will be generated
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ;

-- Add customer_id to store the Stripe customer ID for future operations
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100);

-- Add a column to track failed payment attempts
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS payment_failures INTEGER DEFAULT 0;

-- Create an index on subscription_end_date to quickly find expiring subscriptions
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_end_date ON public.tenants(subscription_end_date);

-- Create an index on customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_customer_id ON public.tenants(customer_id);

-- Update RLS policies to allow system updates to tenant records
-- This is for when webhooks update subscription information
CREATE POLICY IF NOT EXISTS "System can update tenant subscription info" 
ON public.tenants
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Add a function to update tenant subscription information
-- This can be called manually if needed
CREATE OR REPLACE FUNCTION public.update_tenant_subscription(
    p_tenant_id UUID,
    p_subscription_id TEXT,
    p_plan_type TEXT,
    p_subscription_status TEXT,
    p_payment_method TEXT,
    p_customer_id TEXT,
    p_subscription_start_date TIMESTAMPTZ,
    p_subscription_end_date TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
    UPDATE public.tenants
    SET 
        subscription_id = p_subscription_id,
        plan_type = p_plan_type,
        subscription_status = p_subscription_status,
        payment_method = p_payment_method,
        customer_id = p_customer_id,
        last_payment_date = NOW(),
        subscription_start_date = p_subscription_start_date,
        subscription_end_date = p_subscription_end_date,
        subscription_period_end = p_subscription_end_date,
        subscription_renewal_date = p_subscription_end_date,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 