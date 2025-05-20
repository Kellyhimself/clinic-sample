-- Add unique constraint on tenant_id for subscription_limits table
ALTER TABLE public.subscription_limits
ADD CONSTRAINT subscription_limits_tenant_id_key UNIQUE (tenant_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_limits_tenant_id_unique 
ON public.subscription_limits(tenant_id); 