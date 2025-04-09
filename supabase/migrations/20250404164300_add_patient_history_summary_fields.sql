-- Migration file: supabase/migrations/20250404164300_add_patient_history_summary_fields.sql

ALTER TABLE public.patients
ADD COLUMN dental_history_summary TEXT NULL,
ADD COLUMN medical_history_summary TEXT NULL,
ADD COLUMN family_history_summary TEXT NULL,
ADD COLUMN lifestyle_summary TEXT NULL;

COMMENT ON COLUMN public.patients.dental_history_summary IS 'Summary of detailed dental history collected from forms.';
COMMENT ON COLUMN public.patients.medical_history_summary IS 'Summary of detailed medical information collected from forms.';
COMMENT ON COLUMN public.patients.family_history_summary IS 'Summary of family medical and dental history collected from forms.';
COMMENT ON COLUMN public.patients.lifestyle_summary IS 'Summary of lifestyle information (diet, exercise, stress, sleep, etc.) collected from forms.';
