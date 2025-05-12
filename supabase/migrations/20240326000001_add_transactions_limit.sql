-- Add max_transactions_per_month column to subscription_limits table
ALTER TABLE public.subscription_limits
ADD COLUMN IF NOT EXISTS max_transactions_per_month INTEGER;

-- Update existing records with default values based on plan type
UPDATE public.subscription_limits
SET max_transactions_per_month = CASE
    WHEN plan_type = 'free' THEN 50
    WHEN plan_type = 'pro' THEN 1000
    WHEN plan_type = 'enterprise' THEN NULL -- NULL means unlimited
END
WHERE max_transactions_per_month IS NULL; 