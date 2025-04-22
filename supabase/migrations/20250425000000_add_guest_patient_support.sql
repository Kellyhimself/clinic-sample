-- Add is_registered_user column to patients table
ALTER TABLE public.patients ADD COLUMN is_registered_user BOOLEAN DEFAULT TRUE;

-- Make user_id nullable
ALTER TABLE public.patients ALTER COLUMN user_id DROP NOT NULL; 