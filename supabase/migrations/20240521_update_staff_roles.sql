-- Drop the existing constraint
ALTER TABLE staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_role_check;

-- Add the new constraint with all allowed roles
ALTER TABLE staff_invitations ADD CONSTRAINT staff_invitations_role_check 
CHECK (role IN ('admin', 'doctor', 'pharmacist', 'cashier', 'staff')); 