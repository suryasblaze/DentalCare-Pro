-- supabase/migrations/20250410121700_add_tooth_id_to_medical_records.sql

-- Add the tooth_id column, allowing null values
ALTER TABLE public.medical_records
ADD COLUMN tooth_id smallint NULL;

-- Add a foreign key constraint to reference the teeth table
-- ON DELETE SET NULL: If a referenced tooth is deleted, set tooth_id to NULL in medical_records
-- Alternatively, use ON DELETE RESTRICT to prevent deleting a tooth if it's referenced.
ALTER TABLE public.medical_records
ADD CONSTRAINT fk_medical_records_tooth_id
FOREIGN KEY (tooth_id) REFERENCES public.teeth(id)
ON DELETE SET NULL;

-- Add a comment explaining the purpose of the new column
COMMENT ON COLUMN public.medical_records.tooth_id IS 'Optional reference to a specific tooth related to the medical record (using FDI notation ID).';
