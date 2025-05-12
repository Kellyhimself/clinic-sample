-- Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES public.medication_batches(id),
    medication_id UUID NOT NULL REFERENCES public.medications(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    sale_id UUID NOT NULL REFERENCES public.sales(id),
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add the constraint
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_total_price_check 
    CHECK (total_price = quantity * unit_price);

-- Add RLS policies
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.sale_items
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.sale_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.sale_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.sale_items
    FOR DELETE
    TO authenticated
    USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_medication_id ON public.sale_items(medication_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON public.sale_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_id ON public.sale_items(tenant_id); 