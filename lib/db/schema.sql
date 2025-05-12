-- Update subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN paystack_plan_id text,
ADD COLUMN is_active boolean DEFAULT true;

-- Update subscription_invoices table
ALTER TABLE subscription_invoices
ADD COLUMN paystack_payment_id text,
ADD COLUMN paystack_subscription_id text;

-- Update tenants table
ALTER TABLE tenants
ADD COLUMN paystack_customer_id text,
ADD COLUMN paystack_subscription_id text;

-- Remove Stripe-related columns from tenants table
ALTER TABLE tenants
DROP COLUMN IF EXISTS customer_id,
DROP COLUMN IF EXISTS subscription_id,
DROP COLUMN IF EXISTS subscription_period_end,
DROP COLUMN IF EXISTS subscription_renewal_date,
DROP COLUMN IF EXISTS stripe_price_id;

-- Remove Stripe-related columns from subscription_plans table
ALTER TABLE subscription_plans
DROP COLUMN IF EXISTS stripe_price_id; 