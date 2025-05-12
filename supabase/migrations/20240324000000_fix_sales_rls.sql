-- Drop the existing RLS policy
DROP POLICY IF EXISTS sales_tenant_isolation ON sales;

-- Create a new RLS policy using get_tenant_id()
CREATE POLICY sales_tenant_isolation ON sales
  FOR ALL
  TO public
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id()); 