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
  auth_user_exists BOOLEAN;
  profile_exists BOOLEAN;
  error_message TEXT;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO auth_user_exists;

  IF NOT auth_user_exists THEN
    RAISE EXCEPTION 'User does not exist in auth.users table';
  END IF;

  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    -- Create profile if it doesn't exist
    BEGIN
      INSERT INTO profiles (id, full_name, phone_number, role)
      VALUES (p_user_id, p_full_name, p_phone_number, p_new_role);
    EXCEPTION WHEN OTHERS THEN
      error_message := 'Failed to create profile: ' || SQLERRM;
      RAISE EXCEPTION '%', error_message;
    END;
  END IF;

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
      BEGIN
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
      EXCEPTION WHEN OTHERS THEN
        error_message := 'Failed to insert into doctors table: ' || SQLERRM;
        RAISE EXCEPTION '%', error_message;
      END;
    WHEN 'patient' THEN
      BEGIN
        INSERT INTO patients (
          id, 
          user_id,
          full_name, 
          phone_number, 
          date_of_birth, 
          gender, 
          address, 
          created_at
        ) VALUES (
          p_user_id, 
          p_user_id,
          p_full_name, 
          p_phone_number, 
          NULLIF(p_date_of_birth, '')::DATE, 
          NULLIF(p_gender, ''), 
          NULLIF(p_address, ''), 
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        error_message := 'Failed to insert into patients table: ' || SQLERRM;
        RAISE EXCEPTION '%', error_message;
      END;
    WHEN 'pharmacist' THEN
      BEGIN
        INSERT INTO pharmacists (
          id, 
          user_id,
          full_name, 
          phone_number, 
          license_number, 
          specialization, 
          created_at
        ) VALUES (
          p_user_id, 
          p_user_id,
          p_full_name, 
          p_phone_number, 
          COALESCE(NULLIF(p_license_number, ''), 'PENDING'), 
          NULLIF(p_specialization, ''), 
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        error_message := 'Failed to insert into pharmacists table: ' || SQLERRM;
        RAISE EXCEPTION '%', error_message;
      END;
    WHEN 'admin' THEN
      BEGIN
        INSERT INTO admins (
          id, 
          user_id,
          department, 
          permissions, 
          created_at
        ) VALUES (
          p_user_id, 
          p_user_id,
          NULLIF(p_department, ''), 
          p_permissions, 
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        error_message := 'Failed to insert into admins table: ' || SQLERRM;
        RAISE EXCEPTION '%', error_message;
      END;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 