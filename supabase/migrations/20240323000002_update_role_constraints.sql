-- Drop existing foreign key constraints
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey;
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_patient_id_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_patient_id_fkey;
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_sale_id_fkey;

-- Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE appointments 
  ADD CONSTRAINT appointments_doctor_id_fkey 
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

ALTER TABLE appointments 
  ADD CONSTRAINT appointments_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE prescriptions 
  ADD CONSTRAINT prescriptions_doctor_id_fkey 
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

ALTER TABLE prescriptions 
  ADD CONSTRAINT prescriptions_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE sales 
  ADD CONSTRAINT sales_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE sale_items 
  ADD CONSTRAINT sale_items_sale_id_fkey 
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;

-- Drop and recreate the update_user_role function
DROP FUNCTION IF EXISTS update_user_role;

CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID,
  p_new_role TEXT
) RETURNS VOID AS $$
DECLARE
  v_current_role TEXT;
  v_profile_id UUID;
BEGIN
  -- Get current role and profile ID
  SELECT role, id INTO v_current_role, v_profile_id
  FROM profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Update the role in profiles table
  UPDATE profiles
  SET role = p_new_role
  WHERE user_id = p_user_id;

  -- Handle role-specific table updates
  CASE v_current_role
    WHEN 'doctor' THEN
      -- Delete from doctors table (cascade will handle related records)
      DELETE FROM doctors WHERE user_id = p_user_id;
    WHEN 'patient' THEN
      -- Delete from patients table (cascade will handle related records)
      DELETE FROM patients WHERE user_id = p_user_id;
    WHEN 'pharmacist' THEN
      -- Delete from pharmacists table
      DELETE FROM pharmacists WHERE user_id = p_user_id;
    WHEN 'admin' THEN
      -- Delete from admins table
      DELETE FROM admins WHERE user_id = p_user_id;
  END CASE;

  -- Insert into new role table
  CASE p_new_role
    WHEN 'doctor' THEN
      INSERT INTO doctors (user_id, license_number, specialty)
      VALUES (p_user_id, '', '');
    WHEN 'patient' THEN
      INSERT INTO patients (user_id, full_name, phone_number, date_of_birth, gender, address)
      VALUES (p_user_id, '', '', NULL, '', '');
    WHEN 'pharmacist' THEN
      INSERT INTO pharmacists (user_id, license_number)
      VALUES (p_user_id, '');
    WHEN 'admin' THEN
      INSERT INTO admins (user_id)
      VALUES (p_user_id);
  END CASE;

  -- Log the role change
  INSERT INTO audit_logs (action, details, user_id)
  VALUES (
    'role_change',
    jsonb_build_object(
      'old_role', v_current_role,
      'new_role', p_new_role,
      'user_id', p_user_id
    ),
    p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 