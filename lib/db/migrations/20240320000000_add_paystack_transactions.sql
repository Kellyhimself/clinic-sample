-- Create paystack_transactions table
CREATE TABLE IF NOT EXISTS public.paystack_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_reference VARCHAR(255) NOT NULL,
    payment_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.paystack_transactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for service role" ON public.paystack_transactions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON public.paystack_transactions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_paystack_transactions_tenant_id ON public.paystack_transactions(tenant_id);
CREATE INDEX idx_paystack_transactions_payment_reference ON public.paystack_transactions(payment_reference);
CREATE INDEX idx_paystack_transactions_payment_id ON public.paystack_transactions(payment_id); 