-- Drop the existing function
DROP FUNCTION IF EXISTS update_user_role;

-- Create the enhanced function
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_full_name TEXT,
  p_phone_number TEXT,
  p_license_number TEXT DEFAULT '',
  p_specialty TEXT DEFAULT '',
  p_date_of_birth TEXT DEFAULT '',
  p_gender TEXT DEFAULT '',
  p_address TEXT DEFAULT '',
  p_specialization TEXT DEFAULT '',
  p_department TEXT DEFAULT '',
  p_permissions TEXT[] DEFAULT '{}'
) RETURNS void AS $$
DECLARE
  old_role TEXT;
BEGIN
  -- Get the current role
  SELECT role INTO old_role FROM profiles WHERE id = p_user_id;
  
  -- Update the profile role
  UPDATE profiles SET role = p_new_role WHERE id = p_user_id;
  
  -- Handle role-specific table updates
  CASE old_role
    WHEN 'doctor' THEN
      -- Remove from doctors table
      DELETE FROM doctors WHERE id = p_user_id;
    WHEN 'patient' THEN
      -- Remove from patients table
      DELETE FROM patients WHERE id = p_user_id;
    WHEN 'pharmacist' THEN
      -- Remove from pharmacists table
      DELETE FROM pharmacists WHERE id = p_user_id;
    WHEN 'admin' THEN
      -- Remove from admins table
      DELETE FROM admins WHERE id = p_user_id;
  END CASE;
  
  -- Add to new role-specific table
  CASE p_new_role
    WHEN 'doctor' THEN
      INSERT INTO doctors (
        id, 
        user_id, 
        license_number, 
        specialty, 
        created_at
      ) VALUES (
        p_user_id, 
        p_user_id, 
        COALESCE(NULLIF(p_license_number, ''), 'PENDING'), 
        COALESCE(NULLIF(p_specialty, ''), 'General Medicine'), 
        NOW()
      );
    WHEN 'patient' THEN
      INSERT INTO patients (
        id, 
        full_name, 
        phone_number, 
        date_of_birth, 
        gender, 
        address, 
        created_at
      ) VALUES (
        p_user_id, 
        p_full_name, 
        p_phone_number, 
        NULLIF(p_date_of_birth, '')::DATE, 
        NULLIF(p_gender, ''), 
        NULLIF(p_address, ''), 
        NOW()
      );
    WHEN 'pharmacist' THEN
      INSERT INTO pharmacists (
        id, 
        full_name, 
        phone_number, 
        license_number, 
        specialization, 
        created_at
      ) VALUES (
        p_user_id, 
        p_full_name, 
        p_phone_number, 
        COALESCE(NULLIF(p_license_number, ''), 'PENDING'), 
        NULLIF(p_specialization, ''), 
        NOW()
      );
    WHEN 'admin' THEN
      INSERT INTO admins (
        id, 
        department, 
        permissions, 
        created_at
      ) VALUES (
        p_user_id, 
        NULLIF(p_department, ''), 
        p_permissions, 
        NOW()
      );
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 