-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_medication_profit_margins();

-- Create the function to calculate profit margins for medications
CREATE OR REPLACE FUNCTION get_medication_profit_margins()
RETURNS TABLE (
    medication_id uuid,
    medication_name text,
    batch_id uuid,
    batch_number text,
    quantity integer,
    total_price numeric,
    purchase_price numeric,
    unit_price numeric,
    effective_cost numeric,
    total_cost numeric,
    profit numeric,
    profit_margin numeric,
    created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Get tenant ID from context
    v_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
    
    RETURN QUERY
    WITH sales_data AS (
        SELECT 
            si.medication_id,
            m.name as medication_name,
            si.batch_id,
            b.batch_number,
            SUM(si.quantity) as quantity,
            SUM(si.total_price) as total_price,
            b.purchase_price,
            si.unit_price,
            SUM(si.quantity * b.purchase_price) as effective_cost,
            SUM(si.quantity * b.purchase_price) as total_cost,
            SUM(si.total_price - (si.quantity * b.purchase_price)) as profit,
            CASE 
                WHEN SUM(si.quantity * b.purchase_price) > 0 
                THEN ((SUM(si.total_price) - SUM(si.quantity * b.purchase_price)) / SUM(si.quantity * b.purchase_price)) * 100
                ELSE 0 
            END as profit_margin,
            MAX(si.created_at) as created_at
        FROM sale_items si
        JOIN medications m ON m.id = si.medication_id
        JOIN medication_batches b ON b.id = si.batch_id
        WHERE si.tenant_id = v_tenant_id
        GROUP BY 
            si.medication_id,
            m.name,
            si.batch_id,
            b.batch_number,
            b.purchase_price,
            si.unit_price
    )
    SELECT 
        medication_id,
        medication_name,
        batch_id,
        batch_number,
        quantity,
        total_price,
        purchase_price,
        unit_price,
        effective_cost,
        total_cost,
        profit,
        profit_margin,
        created_at
    FROM sales_data
    ORDER BY profit_margin DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_medication_profit_margins TO authenticated; 