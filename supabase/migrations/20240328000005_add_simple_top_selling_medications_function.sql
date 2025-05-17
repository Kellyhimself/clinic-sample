-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_simple_top_selling_medications();

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