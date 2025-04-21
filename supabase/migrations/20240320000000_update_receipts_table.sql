-- Add medication_total and appointment_total columns to receipts table
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS medication_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointment_total DECIMAL(10,2) DEFAULT 0;

-- Update existing receipts to have default values
UPDATE receipts
SET medication_total = 0,
    appointment_total = 0
WHERE medication_total IS NULL OR appointment_total IS NULL; 