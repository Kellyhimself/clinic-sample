-- Create a function to handle role updates
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_full_name TEXT,
  p_phone_number TEXT
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
  END CASE;
  
  -- Add to new role-specific table
  CASE p_new_role
    WHEN 'doctor' THEN
      INSERT INTO doctors (id, user_id, license_number, specialty, created_at)
      VALUES (p_user_id, p_user_id, 'PENDING', 'General Medicine', NOW());
    WHEN 'patient' THEN
      INSERT INTO patients (id, full_name, phone_number, created_at)
      VALUES (p_user_id, p_full_name, p_phone_number, NOW());
    WHEN 'pharmacist' THEN
      INSERT INTO pharmacists (id, full_name, phone_number, created_at)
      VALUES (p_user_id, p_full_name, p_phone_number, NOW());
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 