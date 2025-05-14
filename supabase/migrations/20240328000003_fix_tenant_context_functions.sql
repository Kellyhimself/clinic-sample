-- Drop existing functions
DROP FUNCTION IF EXISTS public.set_tenant_context(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_id() CASCADE;

-- Create the set_tenant_context function
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
RETURNS uuid AS $$
DECLARE
    v_session_id text;
    v_jwt_claims json;
    v_error text;
    v_user_id text;
BEGIN
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

    -- Use user ID as session ID for consistency
    v_session_id := v_user_id;
    RAISE NOTICE 'Using session ID: %', v_session_id;
    
    -- Use UPSERT to handle the tenant context
    INSERT INTO app.tenant_context (session_id, tenant_id, last_accessed_at)
    VALUES (v_session_id, p_tenant_id, now())
    ON CONFLICT (session_id) 
    DO UPDATE SET 
        tenant_id = EXCLUDED.tenant_id,
        last_accessed_at = now();
    
    -- Clean up old contexts (older than 24 hours)
    DELETE FROM app.tenant_context 
    WHERE last_accessed_at < now() - interval '24 hours';
    
    -- Verify the context was set correctly
    IF NOT EXISTS (
        SELECT 1 
        FROM app.tenant_context tc
        WHERE tc.session_id = v_session_id 
        AND tc.tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'Failed to verify tenant context after setting';
    END IF;
    
    RETURN p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the get_tenant_id function
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    v_tenant_id uuid;
    v_session_id text;
    v_jwt_claims json;
    v_error text;
    v_user_id text;
BEGIN
    -- Get JWT claims with error handling
    BEGIN
        v_jwt_claims := current_setting('request.jwt.claims', true)::json;
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
        RAISE EXCEPTION 'Failed to get JWT claims: %', v_error;
    END;

    -- Get user ID from JWT claims
    v_user_id := v_jwt_claims->>'sub';
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user ID found in JWT claims';
    END IF;

    -- Use user ID as session ID for consistency
    v_session_id := v_user_id;
    
    -- Get tenant ID from context
    SELECT tenant_id INTO v_tenant_id
    FROM app.tenant_context
    WHERE session_id = v_session_id;
    
    -- Update last_accessed_at
    IF v_tenant_id IS NOT NULL THEN
        UPDATE app.tenant_context
        SET last_accessed_at = now()
        WHERE session_id = v_session_id;
    END IF;
    
    RETURN v_tenant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated; 