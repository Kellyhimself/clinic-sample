-- Ensure all required columns exist in the medications table
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(100),
ADD COLUMN IF NOT EXISTS strength VARCHAR(100),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sold_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have default values
UPDATE medications
SET manufacturer = NULL,
    barcode = NULL,
    shelf_location = NULL,
    last_restocked_at = NULL,
    last_sold_at = NULL
WHERE manufacturer IS NULL
   OR barcode IS NULL
   OR shelf_location IS NULL
   OR last_restocked_at IS NULL
   OR last_sold_at IS NULL; 