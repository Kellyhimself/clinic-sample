-- Add quick_sale as a valid patient_type
ALTER TABLE guest_patients 
  DROP CONSTRAINT IF EXISTS guest_patients_patient_type_check,
  ADD CONSTRAINT guest_patients_patient_type_check 
  CHECK (patient_type IN ('guest', 'quick_sale'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_patients_tenant_type 
  ON guest_patients(tenant_id, patient_type);

-- Add unique constraint for quick sale patients
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_patients_quick_sale 
  ON guest_patients(tenant_id) 
  WHERE patient_type = 'quick_sale';

-- Add comment explaining the quick sale patient type
COMMENT ON COLUMN guest_patients.patient_type IS 
  'Type of patient: guest for regular guest patients, quick_sale for system-generated quick sale patients'; 