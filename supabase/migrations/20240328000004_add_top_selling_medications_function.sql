-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_top_selling_medications();

-- Create the function with debug logging
CREATE OR REPLACE FUNCTION get_top_selling_medications()
RETURNS TABLE (
    medication_id uuid,
    medication_name text,
    total_quantity bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_debug_info jsonb;
    v_session_id text;
    v_jwt_claims json;
    v_error text;
    v_user_id text;
    v_sales_count integer;
    v_meds_count integer;
BEGIN
    RAISE NOTICE '=== get_top_selling_medications START ===';
    
    -- Get JWT claims with error handling
    BEGIN
        v_jwt_claims := current_setting('request.jwt.claims', true)::json;
        RAISE NOTICE 'JWT claims retrieved: %', v_jwt_claims;
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
        RAISE EXCEPTION 'Failed to get JWT claims: %', v_error;
    END;

    -- Get user ID from JWT claims
    v_user_id := v_jwt_claims->>'sub';
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user ID found in JWT claims';
    END IF;
    RAISE NOTICE 'User ID from JWT: %', v_user_id;

    -- Use user ID as session ID for consistency
    v_session_id := v_user_id;
    RAISE NOTICE 'Looking up tenant_id for session_id: %', v_session_id;
    
    -- Get tenant_id from the context table
    BEGIN
        SELECT tc.tenant_id INTO v_tenant_id
        FROM app.tenant_context tc
        WHERE tc.session_id = v_session_id;
        
        IF v_tenant_id IS NULL THEN
            RAISE EXCEPTION 'No tenant context found for session_id: %', v_session_id;
        END IF;
        
        RAISE NOTICE 'Found tenant_id: %', v_tenant_id;
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
        RAISE EXCEPTION 'Failed to get tenant_id: %', v_error;
    END;
    
    -- Debug info
    v_debug_info := jsonb_build_object(
        'tenant_id', v_tenant_id,
        'timestamp', now()
    );
    
    -- Log debug info
    RAISE NOTICE 'Debug info: %', v_debug_info;
    
    -- Debug: Check if we have any sale items
    SELECT COUNT(*) INTO v_sales_count
    FROM sale_items
    WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Sale items count: %', v_sales_count;
    
    -- Debug: Check if we have any medications
    SELECT COUNT(*) INTO v_meds_count
    FROM medications
    WHERE tenant_id = v_tenant_id;
    RAISE NOTICE 'Medications count: %', v_meds_count;
    
    -- Debug: Check sample data
    RAISE NOTICE 'Sample sale items: %', (
        SELECT json_agg(si)
        FROM (
            SELECT id, medication_id, quantity, tenant_id
            FROM sale_items
            WHERE tenant_id = v_tenant_id
            LIMIT 5
        ) si
    );
    
    -- Debug: Check sample medications
    RAISE NOTICE 'Sample medications: %', (
        SELECT json_agg(m)
        FROM (
            SELECT id, name, tenant_id
            FROM medications
            WHERE tenant_id = v_tenant_id
            LIMIT 5
        ) m
    );
    
    -- Main query using direct aggregation from sale_items
    RAISE NOTICE 'Executing main query...';
    RETURN QUERY
    SELECT 
        si.medication_id,
        m.name AS medication_name,
        SUM(si.quantity)::bigint AS total_quantity
    FROM sale_items si
    LEFT JOIN medications m ON m.id = si.medication_id
    WHERE si.tenant_id = v_tenant_id
    GROUP BY si.medication_id, m.name
    ORDER BY total_quantity DESC;
    
    -- Log the number of rows returned
    GET DIAGNOSTICS v_debug_info = ROW_COUNT;
    RAISE NOTICE 'Number of rows returned: %', v_debug_info;
    RAISE NOTICE '=== get_top_selling_medications SUCCESS ===';
END;
$$; 