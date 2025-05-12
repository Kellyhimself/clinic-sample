-- Enable RLS on medications table
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Create policies for medications table
CREATE POLICY "Enable read access for authenticated users within tenant"
ON medications FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for authenticated users within tenant"
ON medications FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable update for authenticated users within tenant"
ON medications FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable delete for authenticated users within tenant"
ON medications FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

-- Also add policies for medication_batches table
ALTER TABLE medication_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users within tenant"
ON medication_batches FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable insert for authenticated users within tenant"
ON medication_batches FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable update for authenticated users within tenant"
ON medication_batches FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable delete for authenticated users within tenant"
ON medication_batches FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  )
); 