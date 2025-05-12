-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.set_tenant_context(text) CASCADE;
DROP FUNCTION IF EXISTS public.set_tenant_context(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_id() CASCADE;
DROP TABLE IF EXISTS app.tenant_context;

-- Create the tenant context table if it doesn't exist
CREATE TABLE IF NOT EXISTS app.tenant_context (
    session_id text PRIMARY KEY,
    tenant_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now()
);

-- Add last_accessed_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = 'tenant_context' 
        AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE app.tenant_context 
        ADD COLUMN last_accessed_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT ALL ON app.tenant_context TO authenticated;

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
    
    -- Delete any existing context for this session
    DELETE FROM app.tenant_context 
    WHERE session_id = v_session_id;
    
    -- Insert new context with error handling
    BEGIN
        INSERT INTO app.tenant_context (session_id, tenant_id, last_accessed_at)
        VALUES (v_session_id, p_tenant_id, now());
        RAISE NOTICE 'Inserted tenant context: session_id=%, tenant_id=%', v_session_id, p_tenant_id;
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
        RAISE EXCEPTION 'Failed to insert tenant context: %', v_error;
    END;
    
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
        RAISE NOTICE 'JWT claims retrieved in get_tenant_id: %', v_jwt_claims;
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
    RAISE NOTICE 'Looking up tenant_id for session_id: %', v_session_id;
    
    -- Try to get tenant_id from the context table
    BEGIN
        SELECT tc.tenant_id INTO v_tenant_id
        FROM app.tenant_context tc
        WHERE tc.session_id = v_session_id;
        
        IF v_tenant_id IS NOT NULL THEN
            RAISE NOTICE 'Found tenant_id: %', v_tenant_id;
        ELSE
            RAISE NOTICE 'No tenant_id found for session_id: %', v_session_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
        RAISE EXCEPTION 'Failed to get tenant_id: %', v_error;
    END;
    
    -- Update last_accessed_at if found
    IF v_tenant_id IS NOT NULL THEN
        BEGIN
            UPDATE app.tenant_context tc
            SET last_accessed_at = now()
            WHERE tc.session_id = v_session_id;
            RAISE NOTICE 'Updated last_accessed_at for session_id: %', v_session_id;
        EXCEPTION WHEN OTHERS THEN
            v_error := SQLERRM;
            RAISE EXCEPTION 'Failed to update last_accessed_at: %', v_error;
        END;
    END IF;
    
    -- If no tenant_id found, check if the session exists
    IF v_tenant_id IS NULL THEN
        IF EXISTS (
            SELECT 1 
            FROM app.tenant_context tc
            WHERE tc.session_id = v_session_id
        ) THEN
            RAISE EXCEPTION 'Session exists but tenant_id is null';
        END IF;
    END IF;
    
    RETURN v_tenant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_context_session_id ON app.tenant_context(session_id);
CREATE INDEX IF NOT EXISTS idx_tenant_context_last_accessed ON app.tenant_context(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_tenant_context_tenant_id ON app.tenant_context(tenant_id);

-- Clean up old contexts
DELETE FROM app.tenant_context 
WHERE last_accessed_at < now() - interval '24 hours'; 