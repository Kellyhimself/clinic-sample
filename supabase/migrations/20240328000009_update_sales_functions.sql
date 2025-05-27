-- Drop existing functions
DROP FUNCTION IF EXISTS get_top_selling_medications;
DROP FUNCTION IF EXISTS get_medication_profit_margins;

-- Create updated get_top_selling_medications function
CREATE OR REPLACE FUNCTION get_top_selling_medications(
  p_tenant_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
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
    m.id as medication_id,
    CAST(m.name AS text) as medication_name,
    SUM(si.quantity) as total_quantity
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  JOIN medications m ON si.medication_id = m.id
  WHERE s.tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  GROUP BY m.id, m.name
  ORDER BY total_quantity DESC
  LIMIT 10;
END;
$$;

-- Create updated get_medication_profit_margins function
CREATE OR REPLACE FUNCTION get_medication_profit_margins(
  p_tenant_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  medication_id uuid,
  medication_name text,
  total_revenue numeric,
  total_cost numeric,
  profit_margin numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as medication_id,
    CAST(m.name AS text) as medication_name,
    SUM(si.quantity * si.unit_price) as total_revenue,
    SUM(si.quantity * mb.purchase_price) as total_cost,
    CASE 
      WHEN SUM(si.quantity * si.unit_price) = 0 THEN 0
      ELSE (SUM(si.quantity * si.unit_price) - SUM(si.quantity * mb.purchase_price)) / SUM(si.quantity * si.unit_price) * 100
    END as profit_margin
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  JOIN medications m ON si.medication_id = m.id
  JOIN medication_batches mb ON si.batch_id = mb.id
  WHERE s.tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  GROUP BY m.id, m.name
  ORDER BY profit_margin DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_top_selling_medications TO authenticated;
GRANT EXECUTE ON FUNCTION get_medication_profit_margins TO authenticated; 