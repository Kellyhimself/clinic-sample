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

 The usage limit indicator is working perfectly for free plan tenants, but seems to raise alerts and render the @UsageLimitAlert.tsx  component even for pro and enterprise plans. For example in the @PharmacySalesManager.ts@x, the enterprice tenant is being prompted to upgrade.

can we solve this without altering the functionality when it comes to free plan users, assume the contents and limits are being checked correctly for free plan users but not okay for upgraded plans, solve without having to creaaate unnecessary files, use existing feature/limits existing codes

can we update the submit buttons in @NewSaleForm.tsx : 'submit sale' for guest sales and the 'comfirm sale' for quick sale to be @LimitAwareButton.tsx . Make sure to handle the loading state properly when the user gets to that last step to avoid flickering between 'loading..' and the actual buttons content. Refer to how you handled the submit button for the @InventoryForm.tsx . copy that implementation exactly but with limit being transactions

kellyhimself@kellyhimself-ThinkPad-Yoga-11e:~/Development/clinic-sample$ npm run dev

> clinic@0.1.0 dev
> next dev

   ▲ Next.js 15.2.4
   - Local:        http://localhost:3000
   - Environments: .env.local
   - Experiments (use with caution):
     ✓ externalDir

 ✓ Starting...
 ✓ Ready in 18.4s
 ○ Compiling /middleware ...
 ✓ Compiled /middleware in 6.5s (180 modules)
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:42)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:216:11)
    at new Promise (<anonymous>)
    at retryable (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:197:21)
    at SupabaseAuthClient._refreshAccessToken (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1387:81)
    at SupabaseAuthClient._callRefreshToken (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1498:48)
    at SupabaseAuthClient.__loadSession (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:863:51)
    at async SupabaseAuthClient._useSession (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:803:28)
    at async SupabaseAuthClient._emitInitialSession (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1248:16) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at runNextTicks (node:internal/process/task_queues:65:5)
    at process.processTimers (node:internal/timers:526:9)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
AuthRetryableFetchError: fetch failed {
  __isAuthError: true,
  status: 0,
  code: undefined
}
AuthRetryableFetchError: fetch failed {
  __isAuthError: true,
  status: 0,
  code: undefined
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:42)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:216:11)
    at new Promise (<anonymous>)
    at retryable (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:197:21)
    at SupabaseAuthClient._refreshAccessToken (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1387:81)
    at SupabaseAuthClient._callRefreshToken (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1498:48)
    at SupabaseAuthClient.__loadSession (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:863:51)
    at async SupabaseAuthClient._useSession (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:803:28)
    at async SupabaseAuthClient._emitInitialSession (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1248:16) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}
Error: fetch failed
    at context.fetch (/home/kellyhimself/Development/clinic-sample/node_modules/next/dist/server/web/sandbox/context.js:322:60)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:113:25)
    at _handleRequest (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:115:24)
    at _request (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/fetch.js:105:24)
    at eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1392:82)
    at async eval (webpack-internal:///(middleware)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:203:36) {
  
}