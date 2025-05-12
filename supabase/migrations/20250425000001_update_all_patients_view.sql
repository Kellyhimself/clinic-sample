-- Drop the existing view
DROP VIEW IF EXISTS public.all_patients;

-- Create the updated view
CREATE VIEW public.all_patients AS
SELECT 
  p.id,
  p.full_name,
  p.phone_number,
  NULL as email,  -- patients table doesn't have email
  p.date_of_birth,
  p.gender,
  p.address,
  p.created_at,
  p.updated_at,
  'registered' as patient_type,
  p.id as reference_id,
  p.user_id,
  p.tenant_id
FROM patients p
WHERE p.tenant_id = NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text)::uuid

UNION ALL

SELECT 
  g.id,
  g.full_name,
  g.phone_number,
  g.email,  -- guest_patients does have email
  g.date_of_birth,
  g.gender,
  g.address,
  g.created_at,
  g.updated_at,
  g.patient_type,
  g.id as reference_id,
  NULL as user_id,
  g.tenant_id
FROM guest_patients g
WHERE g.tenant_id = NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text)::uuid;

-- Add comment explaining the view
COMMENT ON VIEW public.all_patients IS 'Combined view of all patients (registered and guest) with tenant isolation'; 