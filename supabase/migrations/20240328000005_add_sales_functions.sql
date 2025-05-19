-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_simple_top_selling_medications();
DROP FUNCTION IF EXISTS get_sales_metrics();
DROP FUNCTION IF EXISTS calculate_profit_and_reorders();

-- Create a simple function that returns top selling medications
CREATE OR REPLACE FUNCTION get_simple_top_selling_medications()
RETURNS TABLE (
    medication_id uuid,
    medication_name text,
    total_quantity bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.medication_id,
        m.name AS medication_name,
        SUM(si.quantity)::bigint AS total_quantity
    FROM sale_items si
    LEFT JOIN medications m ON m.id = si.medication_id
    WHERE si.tenant_id = current_setting('app.current_tenant_id')::uuid
    GROUP BY si.medication_id, m.name
    ORDER BY total_quantity DESC;
END;
$$;

-- Create function to calculate sales metrics
CREATE OR REPLACE FUNCTION get_sales_metrics(
    p_sales jsonb,
    p_timeframe text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_metrics jsonb;
BEGIN
    -- Calculate metrics based on sales data
    SELECT jsonb_build_object(
        'total_revenue', COALESCE(SUM(total_amount), 0),
        'total_sales', COUNT(*),
        'average_sale_amount', COALESCE(AVG(total_amount), 0),
        'sales_by_payment_method', jsonb_object_agg(
            payment_method,
            COUNT(*)
        ),
        'sales_by_timeframe', jsonb_object_agg(
            date_trunc('day', created_at::timestamp),
            COUNT(*)
        )
    ) INTO v_metrics
    FROM jsonb_to_recordset(p_sales) AS sales(
        total_amount numeric,
        payment_method text,
        created_at timestamptz
    );

    RETURN v_metrics;
END;
$$;

-- Create function to calculate profit and reorders
CREATE OR REPLACE FUNCTION calculate_profit_and_reorders(
    p_tenant_id uuid
)
RETURNS TABLE (
    medication_id uuid,
    name text,
    total_sales numeric,
    total_cost numeric,
    profit_margin numeric,
    reorder_suggested boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH sales_data AS (
        SELECT 
            si.medication_id,
            m.name,
            SUM(si.quantity) as total_quantity,
            SUM(si.total_price) as total_sales,
            SUM(si.quantity * mb.purchase_price) as total_cost
        FROM sale_items si
        JOIN medications m ON m.id = si.medication_id
        JOIN medication_batches mb ON mb.id = si.batch_id
        WHERE si.tenant_id = p_tenant_id
        GROUP BY si.medication_id, m.name
    )
    SELECT 
        sd.medication_id,
        sd.name,
        sd.total_sales,
        sd.total_cost,
        CASE 
            WHEN sd.total_sales = 0 THEN 0
            ELSE ((sd.total_sales - sd.total_cost) / sd.total_sales) * 100
        END as profit_margin,
        CASE 
            WHEN sd.total_quantity > 100 THEN true
            ELSE false
        END as reorder_suggested
    FROM sales_data sd;
END;
$$; 