-- Drop existing RLS policies for sale_items
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON sale_items;
DROP POLICY IF EXISTS "tenant_isolation_sale_items" ON sale_items;

-- Create new RLS policy for sale_items using get_tenant_id()
CREATE POLICY sale_items_tenant_isolation ON sale_items
  FOR ALL
  TO public
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Drop existing RLS policy for receipts
DROP POLICY IF EXISTS "tenant_isolation_receipts" ON receipts;

-- Create new RLS policy for receipts using get_tenant_id()
CREATE POLICY receipts_tenant_isolation ON receipts
  FOR ALL
  TO public
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id()); 