-- First, ensure subscription_plans table exists with correct type
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for PesaPal transactions
CREATE TABLE IF NOT EXISTS pesapal_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_id TEXT NOT NULL UNIQUE,
  tenant_id UUID REFERENCES tenants(id),
  plan_id TEXT REFERENCES subscription_plans(id),  -- Changed to TEXT to match existing table
  amount DECIMAL(10,2) NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_tracking_id ON pesapal_transactions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_tenant_id ON pesapal_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pesapal_transactions_plan_id ON pesapal_transactions(plan_id); 