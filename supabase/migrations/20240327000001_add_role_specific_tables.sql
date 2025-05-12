-- Create pharmacists table
CREATE TABLE IF NOT EXISTS pharmacists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    license_number TEXT,
    specialization TEXT,
    department TEXT DEFAULT 'Pharmacy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, tenant_id)
);

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    license_number TEXT,
    specialization TEXT,
    department TEXT DEFAULT 'Medical',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, tenant_id)
);

-- Add department column to doctors table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'doctors' 
        AND column_name = 'department'
    ) THEN
        ALTER TABLE doctors ADD COLUMN department TEXT DEFAULT 'Medical';
    END IF;
END $$;

-- Add department column to pharmacists table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pharmacists' 
        AND column_name = 'department'
    ) THEN
        ALTER TABLE pharmacists ADD COLUMN department TEXT DEFAULT 'Pharmacy';
    END IF;
END $$;

-- Create cashiers table if it doesn't exist
CREATE TABLE IF NOT EXISTS cashiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    department TEXT DEFAULT 'Finance',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, tenant_id)
);

-- Add RLS policies for cashiers
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage their cashiers"
    ON cashiers FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Ensure RLS is enabled on existing tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacists ENABLE ROW LEVEL SECURITY;

-- Add or update RLS policies for doctors
CREATE POLICY "Tenant admins can manage their doctors"
    ON doctors FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Add or update RLS policies for pharmacists
CREATE POLICY "Tenant admins can manage their pharmacists"
    ON pharmacists FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Add tenant_id to pharmacists table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pharmacists' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE pharmacists 
        ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        ADD CONSTRAINT pharmacists_tenant_user_unique UNIQUE(user_id, tenant_id);
    END IF;
END $$; 