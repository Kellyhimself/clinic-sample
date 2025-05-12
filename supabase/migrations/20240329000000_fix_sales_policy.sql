-- Drop the existing RLS policy
DROP POLICY IF EXISTS sales_tenant_isolation ON sales;

-- Create a new RLS policy using get_tenant_id()
CREATE POLICY sales_tenant_isolation ON sales
  FOR ALL
  TO public
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Add debug logging to get_tenant_id function
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get tenant ID from context
  v_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
  
  -- Log the tenant ID for debugging
  RAISE NOTICE 'get_tenant_id() called, returning: %', v_tenant_id;
  
  RETURN v_tenant_id;
END;
$$; 