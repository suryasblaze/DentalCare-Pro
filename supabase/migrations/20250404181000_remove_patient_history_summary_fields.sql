-- Migration file: supabase/migrations/20250404181000_remove_patient_history_summary_fields.sql

ALTER TABLE public.patients
DROP COLUMN IF EXISTS dental_history_summary,
DROP COLUMN IF EXISTS medical_history_summary,
DROP COLUMN IF EXISTS family_history_summary,
DROP COLUMN IF EXISTS lifestyle_summary;
