[
  {
    "function_name": "update_updated_at",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "update_tenants_updated_at",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "generate_invitation_token",
    "arguments": "invitation_id uuid",
    "return_type": "text"
  },
  {
    "function_name": "restock_medication",
    "arguments": "p_medication_id uuid, p_quantity integer, p_reason text, p_user_id uuid",
    "return_type": "void"
  },
  {
    "function_name": "check_expiry",
    "arguments": "",
    "return_type": "TABLE(id uuid, name text, batch_no text, expiry_date date, days_until_expiry integer)"
  },
  {
    "function_name": "calculate_profit_and_reorders",
    "arguments": "",
    "return_type": "TABLE(medication_id uuid, name text, total_sales numeric, total_cost numeric, profit_margin numeric, reorder_suggested boolean)"
  },
  {
    "function_name": "send_reorder_reminders",
    "arguments": "",
    "return_type": "void"
  },
  {
    "function_name": "verify_invitation_token",
    "arguments": "token_input text",
    "return_type": "TABLE(id uuid, email text, role text, tenant_id uuid)"
  },
  {
    "function_name": "get_top_selling_medications",
    "arguments": "",
    "return_type": "TABLE(medication_id uuid, medication_name text, total_quantity bigint)"
  },
  {
    "function_name": "create_guest_patient",
    "arguments": "p_full_name text, p_phone_number text, p_email text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_gender text DEFAULT NULL::text, p_address text DEFAULT NULL::text",
    "return_type": "jsonb"
  },
  {
    "function_name": "check_patient_id",
    "arguments": "patient_id text",
    "return_type": "boolean"
  },
  {
    "function_name": "update_subscription_limits_updated_at",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "update_usage_stats_updated_at",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "set_tenant_context",
    "arguments": "tenant_id uuid",
    "return_type": "text"
  },
  {
    "function_name": "get_tenant_id",
    "arguments": "",
    "return_type": "uuid"
  },
  {
    "function_name": "is_system_admin",
    "arguments": "",
    "return_type": "boolean"
  },
  {
    "function_name": "is_tenant_admin",
    "arguments": "p_tenant_id uuid",
    "return_type": "boolean"
  },
  {
    "function_name": "set_medication_batch_tenant_id",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "get_auth_users_by_email",
    "arguments": "email_input text",
    "return_type": "TABLE(id uuid, email text)"
  },
  {
    "function_name": "register_guest_patient",
    "arguments": "p_full_name text, p_phone_number text, p_email text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_gender text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_notes text DEFAULT NULL::text",
    "return_type": "jsonb"
  },
  {
    "function_name": "update_stock",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "log_audit",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "add_system_admin",
    "arguments": "p_user_id uuid",
    "return_type": "void"
  },
  {
    "function_name": "add_system_admin_by_email",
    "arguments": "p_email text",
    "return_type": "void"
  },
  {
    "function_name": "decrement_batch_quantity",
    "arguments": "p_batch_id uuid, p_quantity integer",
    "return_type": "void"
  },
  {
    "function_name": "get_patient_by_id",
    "arguments": "p_id text",
    "return_type": "jsonb"
  },
  {
    "function_name": "update_user_role",
    "arguments": "p_address text, p_date_of_birth text, p_department text, p_full_name text, p_gender text, p_license_number text, p_new_role text, p_permissions text[], p_phone_number text, p_specialization text, p_specialty text, p_user_id uuid",
    "return_type": "void"
  },
  {
    "function_name": "sync_auth_to_users_and_profiles",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "function_name": "user_belongs_to_tenant",
    "arguments": "user_id uuid, tenant_id uuid",
    "return_type": "boolean"
  },
  {
    "function_name": "create_subscription_limit",
    "arguments": "p_tenant_id uuid, p_plan_type text, p_max_patients integer, p_max_appointments_per_month integer, p_max_inventory_items integer, p_max_users integer, p_features text",
    "return_type": "void"
  }
]

--- Drop existing functions if they exist
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
STABLE
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




are we not having duplacated files in relation to features and limits intergration. JUst see:

features.ts, features folder, featureGuard.tsx, featurecheck.ts, subscriptionFeatures.ts, useUsageLimits.ts, usageLimits.ts, planLimits. I hope we are not over complicating things and all these files have there own purposes and cant be removed

curl -X POST http://localhost:3000/api/system-admin/create \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admins@gmail.com&password=password&fullName=Kelly Admin"

  select 
  si.id,
  si.sale_id,
  si.medication_id,
  si.batch_id,
  si.quantity,
  si.unit_price,
  si.total_price,
  si.tenant_id,
  si.created_at,
  m.name as medication_name,
  mb.batch_number,
  s.created_at as sale_date
from sale_items si
left join medications m on m.id = si.medication_id
left join medication_batches mb on mb.id = si.batch_id
left join sales s on s.id = si.sale_id
where si.tenant_id = '3f5b8b9f-794c-4ca0-b418-d63437ec1b21'
order by si.created_at desc
limit 10;

 i want us to style the @HomePage() to give a SAAS landingpage. Maintain the color theme but incorporate the following screenshots to give users a clue of what the app features. 


dropped:
should i delete/remove these existing ones before running the new query? Existing are:

1. calculate_profit_and_reorders:

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


2. get_top_selling_medications():

BEGIN
    RETURN QUERY
    SELECT 
        si.medication_id,
        m.name::text as medication_name,
        SUM(si.quantity)::bigint as total_quantity
    FROM sale_items si
    LEFT JOIN medications m ON m.id = si.medication_id
    WHERE si.tenant_id = p_tenant_id
    GROUP BY si.medication_id, m.name
    ORDER BY total_quantity DESC;
END;

3. get_medication_profit_margins() used in the @PharmacyAnalyticsDashboard.tsx 
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



both functions were expecting a tenantID paramenter/argument
get_top_selling_medications
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

get_medication_profit_margins(tenantID)
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
