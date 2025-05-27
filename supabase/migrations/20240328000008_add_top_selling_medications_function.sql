-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_top_selling_medications(uuid);

-- Create the function to get top selling medications
CREATE OR REPLACE FUNCTION get_top_selling_medications(p_tenant_id uuid)
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
        CAST(m.name AS text) AS medication_name,
        SUM(si.quantity)::bigint AS total_quantity
    FROM sale_items si
    LEFT JOIN medications m ON m.id = si.medication_id
    WHERE si.tenant_id = p_tenant_id
    GROUP BY si.medication_id, m.name
    ORDER BY total_quantity DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_selling_medications(uuid) TO authenticated; 