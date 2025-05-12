-- Add tenant_id column to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add foreign key constraint
ALTER TABLE admins 
  ADD CONSTRAINT admins_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Update existing records to have a tenant_id
-- This assumes you have at least one tenant in the tenants table
UPDATE admins a
SET tenant_id = (
  SELECT id FROM tenants 
  WHERE id = (
    SELECT tenant_id FROM profiles 
    WHERE id = a.user_id
  )
)
WHERE tenant_id IS NULL;

-- Now make tenant_id NOT NULL after populating existing records
ALTER TABLE admins ALTER COLUMN tenant_id SET NOT NULL; 