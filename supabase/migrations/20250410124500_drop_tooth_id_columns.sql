-- supabase/migrations/20250410124500_drop_tooth_id_columns.sql

-- Drop foreign key constraint from treatment_plans
ALTER TABLE public.treatment_plans
DROP CONSTRAINT IF EXISTS fk_treatment_plans_tooth_id;

-- Drop tooth_id column from treatment_plans
ALTER TABLE public.treatment_plans
DROP COLUMN IF EXISTS tooth_id;

-- Drop foreign key constraint from medical_records
ALTER TABLE public.medical_records
DROP CONSTRAINT IF EXISTS fk_medical_records_tooth_id;

-- Drop tooth_id column from medical_records
ALTER TABLE public.medical_records
DROP COLUMN IF EXISTS tooth_id;
