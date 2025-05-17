-- First drop the existing function
DROP FUNCTION IF EXISTS calculate_profit_and_reorders(uuid);

-- Create a new function that directly queries sale_items
CREATE OR REPLACE FUNCTION calculate_profit_and_reorders(p_tenant_id UUID)
RETURNS TABLE (
    medication_id UUID,
    name TEXT,
    total_sales NUMERIC,
    total_cost NUMERIC,
    profit_margin NUMERIC,
    reorder_suggested BOOLEAN,
    debug_info JSONB
) AS $$
DECLARE
    debug_data JSONB;
BEGIN
    -- Build debug data with more detailed sales information
    SELECT jsonb_build_object(
        'tenant_id', p_tenant_id,
        'sales_count', (SELECT COUNT(*) FROM sales WHERE tenant_id = p_tenant_id),
        'sale_items_count', (SELECT COUNT(*) FROM sale_items WHERE tenant_id = p_tenant_id),
        'medications_count', (SELECT COUNT(*) FROM medications WHERE tenant_id = p_tenant_id),
        'sales_with_items_count', (
            SELECT COUNT(DISTINCT s.id)
            FROM sales s
            LEFT JOIN sale_items si ON si.sale_id = s.id
            WHERE s.tenant_id = p_tenant_id
            AND si.id IS NOT NULL
        ),
        'sample_sales', (
            SELECT jsonb_agg(sale_data)
            FROM (
                SELECT jsonb_build_object(
                    'id', s.id,
                    'total_amount', s.total_amount,
                    'created_at', s.created_at,
                    'has_items', EXISTS (
                        SELECT 1 FROM sale_items si 
                        WHERE si.sale_id = s.id
                    ),
                    'items_count', (
                        SELECT COUNT(*)
                        FROM sale_items si
                        WHERE si.sale_id = s.id
                    ),
                    'items', (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', si.id,
                            'medication_id', si.medication_id,
                            'quantity', si.quantity,
                            'total_price', si.total_price
                        ))
                        FROM sale_items si
                        WHERE si.sale_id = s.id
                    )
                ) as sale_data
                FROM sales s
                WHERE s.tenant_id = p_tenant_id
                ORDER BY s.created_at DESC
                LIMIT 5
            ) subq
        ),
        'sample_sale_items', (
            SELECT jsonb_agg(item_data)
            FROM (
                SELECT jsonb_build_object(
                    'id', si.id,
                    'sale_id', si.sale_id,
                    'medication_id', si.medication_id,
                    'total_price', si.total_price,
                    'quantity', si.quantity,
                    'batch_id', si.batch_id,
                    'tenant_id', si.tenant_id,
                    'sale_exists', EXISTS (
                        SELECT 1 FROM sales s
                        WHERE s.id = si.sale_id
                    )
                ) as item_data
                FROM sale_items si
                WHERE si.tenant_id = p_tenant_id
                LIMIT 5
            ) subq
        ),
        'sales_without_items', (
            SELECT jsonb_agg(sale_data)
            FROM (
                SELECT jsonb_build_object(
                    'id', s.id,
                    'total_amount', s.total_amount,
                    'created_at', s.created_at,
                    'items', (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', si.id,
                            'medication_id', si.medication_id,
                            'quantity', si.quantity,
                            'total_price', si.total_price
                        ))
                        FROM sale_items si
                        WHERE si.sale_id = s.id
                    )
                ) as sale_data
                FROM sales s
                LEFT JOIN sale_items si ON si.sale_id = s.id
                WHERE s.tenant_id = p_tenant_id
                AND si.id IS NULL
                ORDER BY s.created_at DESC
                LIMIT 5
            ) subq
        ),
        'sales_check', (
            SELECT jsonb_agg(sale_data)
            FROM (
                SELECT jsonb_build_object(
                    'sale_id', s.id,
                    'total_amount', s.total_amount,
                    'created_at', s.created_at,
                    'items_count', (
                        SELECT COUNT(*)
                        FROM sale_items si
                        WHERE si.sale_id = s.id
                    ),
                    'items_total', (
                        SELECT COALESCE(SUM(total_price), 0)
                        FROM sale_items si
                        WHERE si.sale_id = s.id
                    ),
                    'items', (
                        SELECT jsonb_agg(jsonb_build_object(
                            'id', si.id,
                            'medication_id', si.medication_id,
                            'quantity', si.quantity,
                            'total_price', si.total_price,
                            'batch_id', si.batch_id
                        ))
                        FROM sale_items si
                        WHERE si.sale_id = s.id
                    )
                ) as sale_data
                FROM sales s
                WHERE s.tenant_id = p_tenant_id
                ORDER BY s.created_at DESC
                LIMIT 5
            ) subq
        )
    ) INTO debug_data;

    RETURN QUERY
    WITH medication_sales AS (
        SELECT 
            m.id as medication_id,
            m.name::TEXT as name,
            COALESCE(SUM(si.total_price), 0) as total_sales,
            COALESCE(SUM(
                CASE 
                    WHEN mb.purchase_price > 0 THEN si.quantity * mb.purchase_price
                    ELSE si.quantity * (mb.unit_price * 0.7)
                END
            ), 0) as total_cost
        FROM medications m
        LEFT JOIN sale_items si ON si.medication_id = m.id AND si.tenant_id = p_tenant_id
        LEFT JOIN medication_batches mb ON mb.id = si.batch_id
        WHERE m.tenant_id = p_tenant_id
        GROUP BY m.id, m.name
    )
    SELECT 
        ms.medication_id,
        ms.name,
        ms.total_sales,
        ms.total_cost,
        CASE 
            WHEN ms.total_cost > 0 THEN ((ms.total_sales - ms.total_cost) / ms.total_cost) * 100
            WHEN ms.total_sales > 0 THEN 100
            ELSE 0
        END as profit_margin,
        FALSE as reorder_suggested,
        debug_data as debug_info
    FROM medication_sales ms
    ORDER BY ms.total_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS get_medication_profit_margins(uuid);

-- Create the function
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
) AS $$
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
$$ LANGUAGE plpgsql; 