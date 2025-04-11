-- Drop the existing constraint
ALTER TABLE public.medical_records
DROP CONSTRAINT IF EXISTS medical_records_record_type_check;

-- Add a new constraint with the expanded list of allowed types
ALTER TABLE public.medical_records
ADD CONSTRAINT medical_records_record_type_check
CHECK (record_type IN (
    'examination', 
    'procedure', 
    'prescription', 
    'lab_result', 
    'note',
    -- Add types from the frontend form
    'consultation', 
    'diagnosis', 
    'treatment', 
    'other' 
));

-- Optional: Remove the mapping logic from api.ts as it's no longer needed
-- (We'll do this in a separate step if the migration works)
