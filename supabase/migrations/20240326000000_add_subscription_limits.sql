-- Create subscription_limits table
CREATE TABLE IF NOT EXISTS public.subscription_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    plan_type TEXT NOT NULL,
    max_patients INTEGER,
    max_appointments_per_month INTEGER,
    max_inventory_items INTEGER,
    max_users INTEGER,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.subscription_limits
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.subscription_limits
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.subscription_limits
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.subscription_limits
    FOR DELETE
    TO authenticated
    USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscription_limits_tenant_id ON public.subscription_limits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_limits_plan_type ON public.subscription_limits(plan_type); 