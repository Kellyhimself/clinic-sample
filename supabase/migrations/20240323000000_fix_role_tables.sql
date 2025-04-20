-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS doctors DROP CONSTRAINT IF EXISTS doctors_user_id_fkey;
ALTER TABLE IF EXISTS patients DROP CONSTRAINT IF EXISTS patients_user_id_fkey;
ALTER TABLE IF EXISTS pharmacists DROP CONSTRAINT IF EXISTS pharmacists_user_id_fkey;
ALTER TABLE IF EXISTS admins DROP CONSTRAINT IF EXISTS admins_user_id_fkey;

-- Add user_id column to all role tables if not exists
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS pharmacists ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE IF EXISTS admins ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update existing records to set user_id equal to id
UPDATE doctors SET user_id = id WHERE user_id IS NULL;
UPDATE patients SET user_id = id WHERE user_id IS NULL;
UPDATE pharmacists SET user_id = id WHERE user_id IS NULL;
UPDATE admins SET user_id = id WHERE user_id IS NULL;

-- Add foreign key constraints
ALTER TABLE doctors ADD CONSTRAINT doctors_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE patients ADD CONSTRAINT patients_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE pharmacists ADD CONSTRAINT pharmacists_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE admins ADD CONSTRAINT admins_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Make user_id columns NOT NULL after setting values
ALTER TABLE doctors ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE patients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE pharmacists ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE admins ALTER COLUMN user_id SET NOT NULL; 