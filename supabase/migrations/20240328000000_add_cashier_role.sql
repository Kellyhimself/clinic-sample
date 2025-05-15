-- Drop the existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new check constraint with cashier role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'doctor', 'pharmacist', 'patient', 'cashier')); 