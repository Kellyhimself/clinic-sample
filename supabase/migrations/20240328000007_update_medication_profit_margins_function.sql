-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_medication_profit_margins(uuid);

-- Create the function to calculate profit margins for medications
CREATE OR REPLACE FUNCTION get_medication_profit_margins(p_tenant_id uuid)
RETURNS TABLE (
    medication_id uuid,
    medication_name text,
    batch_id uuid,
    batch_number text,
    quantity bigint,
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
BEGIN
    RETURN QUERY
    SELECT 
        m.id as medication_id,
        m.name::TEXT as medication_name,
        si.batch_id,
        mb.batch_number::TEXT as batch_number,
        si.quantity::BIGINT,
        si.total_price,
        mb.purchase_price,
        mb.unit_price,
        CASE 
            WHEN mb.purchase_price > 0 THEN mb.purchase_price 
            ELSE (mb.unit_price * 0.7) 
        END as effective_cost,
        (si.quantity * CASE 
            WHEN mb.purchase_price > 0 THEN mb.purchase_price 
            ELSE (mb.unit_price * 0.7) 
        END) as total_cost,
        (si.total_price - (si.quantity * CASE 
            WHEN mb.purchase_price > 0 THEN mb.purchase_price 
            ELSE (mb.unit_price * 0.7) 
        END)) as profit,
        CASE 
            WHEN (si.quantity * CASE 
                WHEN mb.purchase_price > 0 THEN mb.purchase_price 
                ELSE (mb.unit_price * 0.7) 
            END) > 0 
            THEN ((si.total_price - (si.quantity * CASE 
                WHEN mb.purchase_price > 0 THEN mb.purchase_price 
                ELSE (mb.unit_price * 0.7) 
            END)) / (si.quantity * CASE 
                WHEN mb.purchase_price > 0 THEN mb.purchase_price 
                ELSE (mb.unit_price * 0.7) 
            END)) * 100 
            ELSE 100 
        END as profit_margin,
        si.created_at
    FROM sale_items si
    JOIN medications m ON si.medication_id = m.id
    JOIN medication_batches mb ON si.batch_id = mb.id
    WHERE si.tenant_id = p_tenant_id
    ORDER BY m.name, si.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_medication_profit_margins(uuid) TO authenticated; 