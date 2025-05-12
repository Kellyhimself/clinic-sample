-- Add stripe_customer_id column to tenants table
ALTER TABLE IF EXISTS "public"."tenants"
ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;

-- Apply RLS policies
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

-- Create or replace policy to allow users to read their own tenant data
CREATE POLICY IF NOT EXISTS "Users can read their own tenant data" 
ON "public"."tenants" 
FOR SELECT 
USING (
  tenant_id() = id
);

-- Create or replace policy to allow users to update their own tenant data
CREATE POLICY IF NOT EXISTS "Users can update their own tenant data" 
ON "public"."tenants" 
FOR UPDATE 
USING (
  tenant_id() = id
); 