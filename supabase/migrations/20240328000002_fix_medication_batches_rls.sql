-- Drop existing RLS policies for medication_batches
DROP POLICY IF EXISTS "Enable read access for authenticated users within tenant" ON medication_batches;
DROP POLICY IF EXISTS "Enable insert for authenticated users within tenant" ON medication_batches;
DROP POLICY IF EXISTS "Enable update for authenticated users within tenant" ON medication_batches;
DROP POLICY IF EXISTS "Enable delete for authenticated users within tenant" ON medication_batches;
DROP POLICY IF EXISTS "Access through medications tenant isolation" ON medication_batches;
DROP POLICY IF EXISTS "Tenant isolation for medication batches" ON medication_batches;
DROP POLICY IF EXISTS "tenant_isolation_medication_batches" ON medication_batches;

-- Create new unified RLS policy for medication_batches using get_tenant_id()
CREATE POLICY medication_batches_tenant_isolation ON medication_batches
  FOR ALL
  TO public
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id()); 