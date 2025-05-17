-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert sale items" ON sale_items;
DROP POLICY IF EXISTS "Allow users to update sale items for their tenant" ON sale_items;
DROP POLICY IF EXISTS "Allow users to view sale items for their tenant" ON sale_items;

-- Create new policies using the same pattern as other tables
CREATE POLICY "Enable insert for authenticated users within tenant" ON sale_items
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Enable update for authenticated users within tenant" ON sale_items
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
    WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Enable read access for authenticated users within tenant" ON sale_items
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())); 